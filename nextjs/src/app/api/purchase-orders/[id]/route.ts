import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { PurchaseOrderFormSchema } from "@/lib/validations/document"
import { calculateAmounts } from "@/lib/utils/document"

// GET - 発注書詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: resolvedParams.id },
      include: {
        supplier: true,
        user: {
          select: {
            id: true,
            lastName: true,
            firstName: true,
            sealImagePath: true,
          },
        },
        items: {
          orderBy: { displayOrder: "asc" },
        },
      },
    })

    if (!purchaseOrder) {
      return NextResponse.json({ error: "発注書が見つかりません" }, { status: 404 })
    }

    // 全ユーザーが閲覧可能

    return NextResponse.json(purchaseOrder)
  } catch (error) {
    console.error("Purchase order fetch error:", error)
    return NextResponse.json({ error: "発注書の取得に失敗しました" }, { status: 500 })
  }
}

// PUT - 発注書更新
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
    const validatedData = PurchaseOrderFormSchema.parse(body)

    // 既存の発注書を取得
    const existingOrder = await prisma.purchaseOrder.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!existingOrder) {
      return NextResponse.json({ error: "発注書が見つかりません" }, { status: 404 })
    }

    // 編集権限チェック（作成者または管理者のみ）
    if (!session.user.isAdmin && existingOrder.userId !== session.user.id) {
      return NextResponse.json({ error: "編集権限がありません" }, { status: 403 })
    }

    // 下書き以外は編集不可
    if (!session.user.isAdmin && existingOrder.status !== "draft") {
      return NextResponse.json({ error: "下書き以外の発注書は編集できません" }, { status: 403 })
    }

    // 税額計算
    const calculationResult = calculateAmounts(
      validatedData.items.map((item, index) => ({
        ...item,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        amount: item.amount || (item.quantity * item.unitPrice).toString(),
        displayOrder: item.displayOrder ?? index
      })),
      {
        taxType: validatedData.taxType,
        taxRate: validatedData.taxRate,
        roundingType: validatedData.roundingType
      }
    )
    const { subtotal, taxAmount: totalTaxAmount, taxAmount8, taxAmount10, totalAmount } = calculationResult

    // トランザクションで更新
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 既存の明細を削除
      await tx.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: resolvedParams.id },
      })

      // 発注書を更新
      const updated = await tx.purchaseOrder.update({
        where: { id: resolvedParams.id },
        data: {
          supplierId: validatedData.supplierId,
          honorific: validatedData.honorific || "御中",
          subject: validatedData.subject,
          issueDate: new Date(validatedData.issueDate),
          deliveryDate: validatedData.deliveryDate ? new Date(validatedData.deliveryDate) : null,
          completionPeriod: validatedData.completionPeriod,
          deliveryLocation: validatedData.deliveryLocation,
          paymentTerms: validatedData.paymentTerms,
          taxType: validatedData.taxType,
          taxRate: validatedData.taxRate,
          roundingType: validatedData.roundingType,
          subtotal: subtotal.toString(),
          taxAmount: totalTaxAmount.toString(),
          taxAmount8: taxAmount8.toString(),
          taxAmount10: taxAmount10.toString(),
          totalAmount: totalAmount.toString(),
          remarks: validatedData.remarks,
          items: {
            create: validatedData.items.map((item, index) => ({
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              taxType: item.taxType,
              taxRate: item.taxRate || validatedData.taxRate,
              amount: item.amount || (item.quantity * item.unitPrice).toString(),
              remarks: item.remarks,
              displayOrder: item.displayOrder ?? index,
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

      return updated
    })

    return NextResponse.json({ purchaseOrder: updatedOrder })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 })
    }
    console.error("Purchase order update error:", error)
    return NextResponse.json({ error: "発注書の更新に失敗しました" }, { status: 500 })
  }
}

// DELETE - 発注書削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    // 既存の発注書を取得
    const existingOrder = await prisma.purchaseOrder.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!existingOrder) {
      return NextResponse.json({ error: "発注書が見つかりません" }, { status: 404 })
    }

    // 削除権限チェック（管理者のみ）
    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "削除権限がありません" }, { status: 403 })
    }

    // 発注書を削除（関連する明細も自動的に削除される）
    await prisma.purchaseOrder.delete({
      where: { id: resolvedParams.id },
    })

    return NextResponse.json({ message: "発注書を削除しました" })
  } catch (error) {
    console.error("Purchase order delete error:", error)
    return NextResponse.json({ error: "発注書の削除に失敗しました" }, { status: 500 })
  }
}