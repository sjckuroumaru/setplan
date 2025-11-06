import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST - 発注請書複製
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

    // 元の発注請書を取得
    const originalConfirmation = await prisma.orderConfirmation.findUnique({
      where: { id: resolvedParams.id },
      include: {
        items: true,
      },
    })

    if (!originalConfirmation) {
      return NextResponse.json({ error: "発注請書が見つかりません" }, { status: 404 })
    }

    // 複製権限チェック（作成者または管理者のみ）
    if (!session.user.isAdmin && originalConfirmation.userId !== session.user.id) {
      return NextResponse.json({ error: "複製権限がありません" }, { status: 403 })
    }

    // 新しい発注請書番号を生成 (YYYY-MM-NNN形式)
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

    // 発注請書を複製
    const duplicatedConfirmation = await prisma.orderConfirmation.create({
      data: {
        confirmationNumber,
        supplierId: originalConfirmation.supplierId,
        honorific: originalConfirmation.honorific,
        subject: originalConfirmation.subject + " (複製)",
        issueDate: new Date(),
        deliveryDate: originalConfirmation.deliveryDate,
        completionPeriod: originalConfirmation.completionPeriod,
        paymentTerms: originalConfirmation.paymentTerms,
        ...(originalConfirmation.purchaseOrderId && { purchaseOrderId: originalConfirmation.purchaseOrderId }),
        userId: session.user.id,
        taxType: originalConfirmation.taxType,
        taxRate: originalConfirmation.taxRate,
        roundingType: originalConfirmation.roundingType,
        subtotal: originalConfirmation.subtotal,
        taxAmount: originalConfirmation.taxAmount,
        taxAmount8: originalConfirmation.taxAmount8,
        taxAmount10: originalConfirmation.taxAmount10,
        totalAmount: originalConfirmation.totalAmount,
        remarks: originalConfirmation.remarks,
        status: "draft",
        items: {
          create: originalConfirmation.items.map(item => ({
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

    return NextResponse.json(duplicatedConfirmation)
  } catch (error) {
    console.error("Order confirmation duplicate error:", error)
    return NextResponse.json({ error: "発注請書の複製に失敗しました" }, { status: 500 })
  }
}
