import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST - 見積書から発注請書を作成
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const body = await request.json()
    const { estimateId } = body

    if (!estimateId) {
      return NextResponse.json({ error: "見積IDが必要です" }, { status: 400 })
    }

    // 見積を取得
    const estimate = await prisma.estimate.findUnique({
      where: { id: estimateId },
      include: {
        items: {
          orderBy: { displayOrder: "asc" },
        },
        customer: true,
      },
    })

    if (!estimate) {
      return NextResponse.json({ error: "見積が見つかりません" }, { status: 404 })
    }

    // 発注請書番号を生成（YYYY-MM-NNN形式）
    const date = new Date()
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    const count = await prisma.orderConfirmation.count({
      where: {
        confirmationNumber: {
          startsWith: yearMonth,
        },
      },
    })
    const sequenceNumber = String(count + 1).padStart(3, "0")
    const confirmationNumber = `${yearMonth}-${sequenceNumber}`

    // 発注請書を作成
    const orderConfirmation = await prisma.orderConfirmation.create({
      data: {
        confirmationNumber,
        supplierId: estimate.customerId, // 見積の顧客を発注先として使用
        honorific: estimate.honorific,
        subject: estimate.subject,
        issueDate: new Date(),
        userId: session.user.id,
        taxType: estimate.taxType,
        taxRate: estimate.taxRate,
        roundingType: estimate.roundingType,
        subtotal: estimate.subtotal,
        taxAmount: estimate.taxAmount,
        taxAmount8: 0,
        taxAmount10: 0,
        totalAmount: estimate.totalAmount,
        remarks: estimate.remarks,
        status: "draft",
        items: {
          create: estimate.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            taxType: item.taxType,
            taxRate: estimate.taxRate,
            amount: item.amount,
            remarks: item.remarks,
            displayOrder: item.displayOrder,
          })),
        },
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
        items: {
          orderBy: { displayOrder: "asc" },
        },
      },
    })

    return NextResponse.json({ orderConfirmation })
  } catch (error) {
    console.error("Order confirmation creation from estimate error:", error)
    return NextResponse.json(
      { error: "発注請書の作成に失敗しました" },
      { status: 500 }
    )
  }
}
