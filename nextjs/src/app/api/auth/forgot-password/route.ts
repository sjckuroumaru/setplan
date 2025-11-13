import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendPasswordResetEmail } from "@/lib/email"
import crypto from "crypto"
import { z } from "zod"

const forgotPasswordSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = forgotPasswordSchema.parse(body)

    // ユーザーの存在確認
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    // セキュリティのため、ユーザーが存在しない場合も成功レスポンスを返す
    // （メールアドレスの存在を推測されないようにするため）
    if (!user) {
      return NextResponse.json({
        message: "パスワードリセットメールを送信しました。メールをご確認ください。",
      })
    }

    // ユーザーがアクティブでない場合
    if (user.status !== "active") {
      return NextResponse.json({
        message: "パスワードリセットメールを送信しました。メールをご確認ください。",
      })
    }

    // 既存のトークンを削除
    await prisma.passwordResetToken.deleteMany({
      where: { email: validatedData.email },
    })

    // リセットトークンを生成（セキュアなランダム文字列）
    const resetToken = crypto.randomBytes(32).toString("hex")

    // トークンのハッシュ化（DBに保存するため）
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex")

    // トークンをDBに保存（24時間有効）
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    await prisma.passwordResetToken.create({
      data: {
        email: validatedData.email,
        token: hashedToken,
        expiresAt,
      },
    })

    // パスワードリセットメールを送信（ハッシュ化されていないトークンを使用）
    const emailResult = await sendPasswordResetEmail(
      validatedData.email,
      resetToken
    )

    if (!emailResult.success) {
      console.error("Failed to send password reset email:", emailResult.error)
      // メール送信に失敗してもユーザーには成功と伝える（セキュリティ上の理由）
    }

    return NextResponse.json({
      message: "パスワードリセットメールを送信しました。メールをご確認ください。",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error("Forgot password error:", error)
    return NextResponse.json(
      { error: "パスワードリセットのリクエストに失敗しました" },
      { status: 500 }
    )
  }
}
