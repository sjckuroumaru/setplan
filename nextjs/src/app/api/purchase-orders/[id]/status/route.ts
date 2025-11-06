import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const StatusUpdateSchema = z.object({
  status: z.enum(["draft", "sent", "approved", "rejected", "closed"]),
})

// PUT - ステータス更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const resolvedParams = await params
    const body = await request.json()
    const validatedData = StatusUpdateSchema.parse(body)

    // 既存の発注書を確認
    const existingPurchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!existingPurchaseOrder) {
      return NextResponse.json({ error: "発注書が見つかりません" }, { status: 404 })
    }

    // 権限チェック（管理者または作成者のみ）
    if (!session.user.isAdmin && existingPurchaseOrder.userId !== session.user.id) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 })
    }

    // 発注書更新
    const purchaseOrder = await prisma.purchaseOrder.update({
      where: { id: resolvedParams.id },
      data: {
        status: validatedData.status,
      },
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

    return NextResponse.json({ purchaseOrder })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 })
    }
    console.error("Purchase order status update error:", error)
    return NextResponse.json({ error: "ステータスの更新に失敗しました" }, { status: 500 })
  }
}
