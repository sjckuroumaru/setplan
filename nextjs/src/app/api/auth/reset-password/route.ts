import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { z } from "zod"

const resetPasswordSchema = z.object({
  token: z.string().min(1, "トークンが必要です"),
  password: z.string().min(6, "パスワードは6文字以上で入力してください"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = resetPasswordSchema.parse(body)

    // トークンをハッシュ化
    const hashedToken = crypto
      .createHash("sha256")
      .update(validatedData.token)
      .digest("hex")

    // トークンの検証
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
    })

    if (!resetToken) {
      return NextResponse.json(
        { error: "無効なトークンです" },
        { status: 400 }
      )
    }

    // トークンの有効期限確認
    if (resetToken.expiresAt < new Date()) {
      // 期限切れのトークンを削除
      await prisma.passwordResetToken.delete({
        where: { token: hashedToken },
      })

      return NextResponse.json(
        { error: "トークンの有効期限が切れています。再度パスワードリセットをリクエストしてください。" },
        { status: 400 }
      )
    }

    // ユーザーの取得
    const user = await prisma.user.findUnique({
      where: { email: resetToken.email },
    })

    if (!user) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      )
    }

    // ユーザーがアクティブでない場合
    if (user.status !== "active") {
      return NextResponse.json(
        { error: "このアカウントは無効化されています" },
        { status: 403 }
      )
    }

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // パスワードを更新
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    })

    // 使用済みトークンを削除
    await prisma.passwordResetToken.delete({
      where: { token: hashedToken },
    })

    // このユーザーの他のリセットトークンも削除
    await prisma.passwordResetToken.deleteMany({
      where: { email: resetToken.email },
    })

    return NextResponse.json({
      message: "パスワードが正常にリセットされました",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error("Reset password error:", error)
    return NextResponse.json(
      { error: "パスワードのリセットに失敗しました" },
      { status: 500 }
    )
  }
}
