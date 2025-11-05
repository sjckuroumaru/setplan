import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST - 発注書複製
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
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

    // 元の発注書を取得
    const originalOrder = await prisma.purchaseOrder.findUnique({
      where: { id: resolvedParams.id },
      include: {
        items: true,
      },
    })

    if (!originalOrder) {
      return NextResponse.json({ error: "発注書が見つかりません" }, { status: 404 })
    }

    // 複製権限チェック（作成者または管理者のみ）
    if (!session.user.isAdmin && originalOrder.userId !== session.user.id) {
      return NextResponse.json({ error: "複製権限がありません" }, { status: 403 })
    }

    // 新しい発注書番号を生成 (YYYY-MM-NNN形式)
    const date = new Date()
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

    const count = await prisma.purchaseOrder.count({
      where: {
        orderNumber: {
          startsWith: yearMonth,
        },
      },
    })

    const sequenceNumber = String(count + 1).padStart(3, "0")
    const orderNumber = `${yearMonth}-${sequenceNumber}`

    // 発注書を複製
    const duplicatedOrder = await prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId: originalOrder.supplierId,
        honorific: originalOrder.honorific,
        subject: originalOrder.subject + " (複製)",
        issueDate: new Date(),
        deliveryDate: originalOrder.deliveryDate,
        completionPeriod: originalOrder.completionPeriod,
        deliveryLocation: originalOrder.deliveryLocation,
        paymentTerms: originalOrder.paymentTerms,
        userId: session.user.id,
        taxType: originalOrder.taxType,
        taxRate: originalOrder.taxRate,
        roundingType: originalOrder.roundingType,
        subtotal: originalOrder.subtotal,
        taxAmount: originalOrder.taxAmount,
        taxAmount8: originalOrder.taxAmount8,
        taxAmount10: originalOrder.taxAmount10,
        totalAmount: originalOrder.totalAmount,
        remarks: originalOrder.remarks,
        status: "draft",
        items: {
          create: originalOrder.items.map(item => ({
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

    return NextResponse.json(duplicatedOrder)
  } catch (error) {
    console.error("Purchase order duplicate error:", error)
    return NextResponse.json({ error: "発注書の複製に失敗しました" }, { status: 500 })
  }
}