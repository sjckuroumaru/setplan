import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// ステータス更新用スキーマ
const updateStatusSchema = z.object({
  status: z.enum(["draft", "sent", "approved", "rejected", "closed"]),
})

// PUT - 発注書ステータス更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateStatusSchema.parse(body)

    // 既存の発注書を取得
    const existingOrder = await prisma.purchaseOrder.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!existingOrder) {
      return NextResponse.json({ error: "発注書が見つかりません" }, { status: 404 })
    }

    // ステータス更新権限チェック
    // 管理者または作成者のみがステータスを変更可能
    if (!session.user.isAdmin && existingOrder.userId !== session.user.id) {
      return NextResponse.json({ error: "ステータスを変更する権限がありません" }, { status: 403 })
    }

    // ステータス遷移のバリデーション
    // closed状態からの変更は管理者のみ可能
    if (existingOrder.status === "closed" && !session.user.isAdmin) {
      return NextResponse.json({ error: "完了済みの発注書は変更できません" }, { status: 403 })
    }

    // 発注書のステータスを更新
    const updatedOrder = await prisma.purchaseOrder.update({
      where: { id: resolvedParams.id },
      data: { status: validatedData.status },
      include: {
        supplier: true,
        user: {
          select: {
            id: true,
            lastName: true,
            firstName: true,
          },
        },
        items: {
          orderBy: { displayOrder: "asc" },
        },
      },
    })

    return NextResponse.json({ purchaseOrder: updatedOrder })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 })
    }
    console.error("Purchase order status update error:", error)
    return NextResponse.json({ error: "ステータスの更新に失敗しました" }, { status: 500 })
  }
}