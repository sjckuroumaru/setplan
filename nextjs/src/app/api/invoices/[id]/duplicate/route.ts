import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST - 請求書複製
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
    // 元の請求書を取得
    const originalInvoice = await prisma.invoice.findUnique({
      where: { id: resolvedParams.id },
      include: {
        items: {
          orderBy: { displayOrder: "asc" },
        },
      },
    })

    if (!originalInvoice) {
      return NextResponse.json({ error: "請求書が見つかりません" }, { status: 404 })
    }

    // 請求書番号の生成 (YYYY-MM-NNN形式)
    const date = new Date()
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

    // 今月の請求書数を取得
    const count = await prisma.invoice.count({
      where: {
        invoiceNumber: {
          startsWith: yearMonth,
        },
      },
    })

    const sequenceNumber = String(count + 1).padStart(3, "0")
    const invoiceNumber = `${yearMonth}-${sequenceNumber}`

    // 新しい請求書を作成
    const newInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: originalInvoice.customerId,
        honorific: originalInvoice.honorific,
        subject: originalInvoice.subject + " (複製)",
        issueDate: new Date(),
        dueDate: new Date(originalInvoice.dueDate),
        userId: session.user.id,
        taxType: originalInvoice.taxType,
        taxRate: originalInvoice.taxRate,
        roundingType: originalInvoice.roundingType,
        subtotal: originalInvoice.subtotal,
        taxAmount: originalInvoice.taxAmount,
        taxAmount8: originalInvoice.taxAmount8,
        taxAmount10: originalInvoice.taxAmount10,
        totalAmount: originalInvoice.totalAmount,
        remarks: originalInvoice.remarks,
        status: "draft",
        items: {
          create: originalInvoice.items.map(item => ({
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

    return NextResponse.json({ invoice: newInvoice })
  } catch (error) {
    console.error("Invoice duplicate error:", error)
    return NextResponse.json({ error: "請求書の複製に失敗しました" }, { status: 500 })
  }
}