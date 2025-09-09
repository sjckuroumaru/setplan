import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const StatusUpdateSchema = z.object({
  status: z.enum(["draft", "sent", "paid", "cancelled"]),
  paidAmount: z.string().optional(),
  paidDate: z.string().optional(),
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

    // 既存の請求書を確認
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!existingInvoice) {
      return NextResponse.json({ error: "請求書が見つかりません" }, { status: 404 })
    }

    // 権限チェック（管理者または作成者のみ）
    if (!session.user.isAdmin && existingInvoice.userId !== session.user.id) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 })
    }

    // ステータス更新データの準備
    const updateData: any = {
      status: validatedData.status,
    }

    // 入金済みの場合は入金情報も更新
    if (validatedData.status === "paid") {
      updateData.paidAmount = validatedData.paidAmount || existingInvoice.totalAmount
      updateData.paidDate = validatedData.paidDate ? new Date(validatedData.paidDate) : new Date()
    }

    // 請求書更新
    const invoice = await prisma.invoice.update({
      where: { id: resolvedParams.id },
      data: updateData,
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

    return NextResponse.json({ invoice })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 })
    }
    console.error("Invoice status update error:", error)
    return NextResponse.json({ error: "ステータスの更新に失敗しました" }, { status: 500 })
  }
}