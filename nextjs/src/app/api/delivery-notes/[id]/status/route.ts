import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const StatusUpdateSchema = z.object({
  status: z.enum(["draft", "sent"]),
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

    // 既存の納品書を確認
    const existingDeliveryNote = await prisma.deliveryNote.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!existingDeliveryNote) {
      return NextResponse.json({ error: "納品書が見つかりません" }, { status: 404 })
    }

    // 権限チェック（管理者または作成者のみ）
    if (!session.user.isAdmin && existingDeliveryNote.userId !== session.user.id) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 })
    }

    // 納品書更新
    const deliveryNote = await prisma.deliveryNote.update({
      where: { id: resolvedParams.id },
      data: {
        status: validatedData.status,
      },
      include: {
        customer: true,
        user: {
          select: {
            id: true,
            lastName: true,
            firstName: true,
          },
        },
      },
    })

    return NextResponse.json({ deliveryNote })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 })
    }
    console.error("Delivery note status update error:", error)
    return NextResponse.json({ error: "ステータスの更新に失敗しました" }, { status: 500 })
  }
}
