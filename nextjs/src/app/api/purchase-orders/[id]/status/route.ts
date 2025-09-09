import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

    const { status } = await request.json()

    // 既存の発注書を取得
    const existingOrder = await prisma.purchaseOrder.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!existingOrder) {
      return NextResponse.json({ error: "発注書が見つかりません" }, { status: 404 })
    }

    // 更新権限チェック（作成者または管理者のみ）
    if (!session.user.isAdmin && existingOrder.userId !== session.user.id) {
      return NextResponse.json({ error: "更新権限がありません" }, { status: 403 })
    }

    // ステータスの妥当性チェック
    const validStatuses = ["draft", "sent", "confirmed", "delivered", "accepted", "cancelled"]
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "無効なステータスです" }, { status: 400 })
    }

    // ステータスを更新
    const updatedOrder = await prisma.purchaseOrder.update({
      where: { id: resolvedParams.id },
      data: { status },
      include: {
        supplier: true,
        user: {
          select: {
            id: true,
            lastName: true,
            firstName: true,
          },
        },
      },
    })

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error("Purchase order status update error:", error)
    return NextResponse.json({ error: "ステータスの更新に失敗しました" }, { status: 500 })
  }
}