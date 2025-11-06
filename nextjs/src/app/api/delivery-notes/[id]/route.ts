import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const DeliveryNoteUpdateSchema = z.object({
  customerId: z.string().min(1, "顧客は必須です"),
  honorific: z.string().optional(),
  subject: z.string().min(1, "件名は必須です"),
  deliveryDate: z.string(),
  taxType: z.enum(["inclusive", "exclusive"]),
  taxRate: z.number(),
  roundingType: z.enum(["floor", "ceil", "round"]),
  remarks: z.string().optional(),
  items: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1, "項目名は必須です"),
    quantity: z.string(),
    unit: z.string().optional(),
    unitPrice: z.string(),
    taxType: z.enum(["taxable", "non-taxable", "tax-included"]),
    taxRate: z.number(),
    amount: z.string(),
    remarks: z.string().optional(),
    displayOrder: z.number(),
  })),
})

// GET - 納品書詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const resolvedParams = await params
    const deliveryNote = await prisma.deliveryNote.findUnique({
      where: { id: resolvedParams.id },
      include: {
        customer: true,
        user: {
          select: {
            id: true,
            lastName: true,
            firstName: true,
            sealImagePath: true,
          },
        },
        estimate: true,
        items: {
          orderBy: { displayOrder: "asc" },
        },
      },
    })

    if (!deliveryNote) {
      return NextResponse.json({ error: "納品書が見つかりません" }, { status: 404 })
    }

    // 管理者以外は自分の納品書のみ閲覧可能
    if (!session.user.isAdmin && deliveryNote.userId !== session.user.id) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 })
    }

    return NextResponse.json({ deliveryNote })
  } catch (error) {
    console.error("DeliveryNote fetch error:", error)
    return NextResponse.json({ error: "納品書の取得に失敗しました" }, { status: 500 })
  }
}

// PUT - 納品書更新
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
    const validatedData = DeliveryNoteUpdateSchema.parse(body)

    // 既存の納品書を確認
    const existingDeliveryNote = await prisma.deliveryNote.findUnique({
      where: { id: resolvedParams.id },
      include: { items: true },
    })

    if (!existingDeliveryNote) {
      return NextResponse.json({ error: "納品書が見つかりません" }, { status: 404 })
    }

    // 権限チェック
    if (!session.user.isAdmin && existingDeliveryNote.userId !== session.user.id) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 })
    }

    // ステータスがsent以降は編集不可（管理者除く）
    if (!session.user.isAdmin && existingDeliveryNote.status !== "draft") {
      return NextResponse.json({ error: "送付済みの納品書は編集できません" }, { status: 403 })
    }

    // 税額計算
    let subtotal = 0
    let taxAmount8 = 0
    let taxAmount10 = 0

    const items = validatedData.items.map(item => {
      const amount = parseFloat(item.amount)
      subtotal += amount

      if (item.taxType === "taxable") {
        if (item.taxRate === 8) {
          taxAmount8 += amount * 0.08
        } else if (item.taxRate === 10) {
          taxAmount10 += amount * 0.1
        }
      }

      return {
        ...item,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
      }
    })

    // 端数処理
    const roundingFn = validatedData.roundingType === "floor" ? Math.floor :
                       validatedData.roundingType === "ceil" ? Math.ceil : Math.round

    taxAmount8 = roundingFn(taxAmount8)
    taxAmount10 = roundingFn(taxAmount10)
    const totalTaxAmount = taxAmount8 + taxAmount10
    const totalAmount = subtotal + totalTaxAmount

    // 明細の更新処理
    const existingItemIds = existingDeliveryNote.items.map(item => item.id)
    const updatedItemIds = items.filter(item => item.id).map(item => item.id)
    const itemsToDelete = existingItemIds.filter(id => !updatedItemIds.includes(id))

    // 納品書更新
    const deliveryNote = await prisma.$transaction(async (tx) => {
      // 削除する明細を削除
      if (itemsToDelete.length > 0) {
        await tx.deliveryNoteItem.deleteMany({
          where: {
            id: { in: itemsToDelete },
            deliveryNoteId: resolvedParams.id,
          },
        })
      }

      // 納品書本体を更新
      return await tx.deliveryNote.update({
        where: { id: resolvedParams.id },
        data: {
          customerId: validatedData.customerId,
          honorific: validatedData.honorific || "御中",
          subject: validatedData.subject,
          deliveryDate: new Date(validatedData.deliveryDate),
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
            upsert: items.map((item) => ({
              where: { id: item.id || "new" },
              create: item,
              update: item,
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
    })

    return NextResponse.json({ deliveryNote })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 })
    }
    console.error("DeliveryNote update error:", error)
    return NextResponse.json({ error: "納品書の更新に失敗しました" }, { status: 500 })
  }
}

// DELETE - 納品書削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    // 管理者のみ削除可能
    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 })
    }

    const resolvedParams = await params
    // 既存の納品書を確認
    const existingDeliveryNote = await prisma.deliveryNote.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!existingDeliveryNote) {
      return NextResponse.json({ error: "納品書が見つかりません" }, { status: 404 })
    }

    await prisma.deliveryNote.delete({
      where: { id: resolvedParams.id },
    })

    return NextResponse.json({ message: "納品書を削除しました" })
  } catch (error) {
    console.error("DeliveryNote delete error:", error)
    return NextResponse.json({ error: "納品書の削除に失敗しました" }, { status: 500 })
  }
}
