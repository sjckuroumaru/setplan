import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST - 納品書複製
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    // セッションのユーザーが存在するか確認
    const sessionUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!sessionUser || sessionUser.status !== "active") {
      return NextResponse.json({ error: "ユーザーが見つからないか、無効になっています" }, { status: 401 })
    }

    const resolvedParams = await params
    // 元の納品書を取得
    const originalDeliveryNote = await prisma.deliveryNote.findUnique({
      where: { id: resolvedParams.id },
      include: {
        items: {
          orderBy: { displayOrder: "asc" },
        },
      },
    })

    if (!originalDeliveryNote) {
      return NextResponse.json({ error: "納品書が見つかりません" }, { status: 404 })
    }

    // 納品書番号の生成 (YYYY-MM-NNN形式)
    const date = new Date()
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

    // 今月の納品書数を取得
    const count = await prisma.deliveryNote.count({
      where: {
        deliveryNoteNumber: {
          startsWith: yearMonth,
        },
      },
    })

    const sequenceNumber = String(count + 1).padStart(3, "0")
    const deliveryNoteNumber = `${yearMonth}-${sequenceNumber}`

    // 新しい納品書を作成
    const newDeliveryNote = await prisma.deliveryNote.create({
      data: {
        deliveryNoteNumber,
        customerId: originalDeliveryNote.customerId,
        honorific: originalDeliveryNote.honorific,
        subject: originalDeliveryNote.subject + " (複製)",
        deliveryDate: new Date(),
        userId: session.user.id,
        taxType: originalDeliveryNote.taxType,
        taxRate: originalDeliveryNote.taxRate,
        roundingType: originalDeliveryNote.roundingType,
        subtotal: originalDeliveryNote.subtotal,
        taxAmount: originalDeliveryNote.taxAmount,
        taxAmount8: originalDeliveryNote.taxAmount8,
        taxAmount10: originalDeliveryNote.taxAmount10,
        totalAmount: originalDeliveryNote.totalAmount,
        remarks: originalDeliveryNote.remarks,
        status: "draft",
        items: {
          create: originalDeliveryNote.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            taxType: item.taxType,
            taxRate: item.taxRate,
            amount: item.amount,
            remarks: item.remarks,
            displayOrder: item.displayOrder,
          })),
        },
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
        items: {
          orderBy: { displayOrder: "asc" },
        },
      },
    })

    return NextResponse.json({ deliveryNote: newDeliveryNote })
  } catch (error) {
    console.error("DeliveryNote duplicate error:", error)
    return NextResponse.json({ error: "納品書の複製に失敗しました" }, { status: 500 })
  }
}
