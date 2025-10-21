import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateEstimateAmount } from "@/lib/estimate-calc"
import { z } from "zod"
import { Decimal } from "@prisma/client/runtime/library"

const EstimateItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "項目名は必須です"),
  quantity: z.number().positive("数量は正の数である必要があります"),
  unit: z.string().optional(),
  unitPrice: z.number().min(0, "単価は0以上である必要があります"),
  taxType: z.enum(["taxable", "non-taxable", "tax-included"]),
  remarks: z.string().optional(),
  displayOrder: z.number().optional(),
})

const EstimateUpdateSchema = z.object({
  customerId: z.string().min(1, "顧客は必須です"),
  honorific: z.string().default("御中"),
  subject: z.string().min(1, "件名は必須です"),
  issueDate: z.string().optional(),
  validUntil: z.string().optional(),
  taxType: z.enum(["inclusive", "exclusive"]).default("exclusive"),
  taxRate: z.number().default(10),
  roundingType: z.enum(["floor", "ceil", "round"]).default("floor"),
  remarks: z.string().optional(),
  status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]).default("draft"),
  items: z.array(EstimateItemSchema),
})

// GET - 見積詳細取得
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
    const estimate = await prisma.estimate.findUnique({
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
        items: {
          orderBy: { displayOrder: "asc" },
        },
      },
    })

    if (!estimate) {
      return NextResponse.json({ error: "見積が見つかりません" }, { status: 404 })
    }

    // 管理者以外は自分の見積のみ閲覧可能
    if (!session.user.isAdmin && estimate.userId !== session.user.id) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 })
    }

    return NextResponse.json({ estimate })
  } catch (error) {
    console.error("Estimate fetch error:", error)
    return NextResponse.json({ error: "見積の取得に失敗しました" }, { status: 500 })
  }
}

// PUT - 見積更新
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
    const validatedData = EstimateUpdateSchema.parse(body)

    // 既存の見積を確認
    const existingEstimate = await prisma.estimate.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!existingEstimate) {
      return NextResponse.json({ error: "見積が見つかりません" }, { status: 404 })
    }

    // 管理者以外は自分の見積のみ編集可能
    if (!session.user.isAdmin && existingEstimate.userId !== session.user.id) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 })
    }

    // 日付の処理
    const issueDate = validatedData.issueDate 
      ? new Date(validatedData.issueDate) 
      : existingEstimate.issueDate
    
    const validUntil = validatedData.validUntil
      ? new Date(validatedData.validUntil)
      : existingEstimate.validUntil

    // 金額計算
    const { subtotal, taxAmount, totalAmount } = calculateEstimateAmount(
      validatedData.items,
      validatedData.taxRate,
      validatedData.taxType as "inclusive" | "exclusive",
      validatedData.roundingType as "floor" | "ceil" | "round"
    )

    // トランザクションで見積と明細を更新
    const estimate = await prisma.$transaction(async (tx) => {
      // 見積書更新
      await tx.estimate.update({
        where: { id: resolvedParams.id },
        data: {
          customerId: validatedData.customerId,
          honorific: validatedData.honorific,
          subject: validatedData.subject,
          issueDate,
          validUntil,
          taxType: validatedData.taxType,
          taxRate: validatedData.taxRate,
          roundingType: validatedData.roundingType,
          subtotal,
          taxAmount,
          totalAmount,
          remarks: validatedData.remarks,
          status: validatedData.status,
        },
      })

      // 既存の明細を削除
      await tx.estimateItem.deleteMany({
        where: { estimateId: resolvedParams.id },
      })

      // 新しい明細を作成
      if (validatedData.items.length > 0) {
        const itemsData = validatedData.items.map((item, index) => ({
          estimateId: resolvedParams.id,
          name: item.name,
          quantity: new Decimal(item.quantity),
          unit: item.unit,
          unitPrice: new Decimal(item.unitPrice),
          taxType: item.taxType,
          amount: new Decimal(item.quantity).mul(new Decimal(item.unitPrice)),
          remarks: item.remarks,
          displayOrder: item.displayOrder ?? index,
        }))

        await tx.estimateItem.createMany({
          data: itemsData,
        })
      }

      // 更新した見積を返す
      return await tx.estimate.findUnique({
        where: { id: resolvedParams.id },
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

    return NextResponse.json({ estimate })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 })
    }
    console.error("Estimate update error:", error)
    return NextResponse.json({ error: "見積の更新に失敗しました" }, { status: 500 })
  }
}

// DELETE - 見積削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const resolvedParams = await params
    // 既存の見積を確認
    const existingEstimate = await prisma.estimate.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!existingEstimate) {
      return NextResponse.json({ error: "見積が見つかりません" }, { status: 404 })
    }

    // 管理者以外は自分の見積のみ削除可能
    if (!session.user.isAdmin && existingEstimate.userId !== session.user.id) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 })
    }

    await prisma.estimate.delete({
      where: { id: resolvedParams.id },
    })

    return NextResponse.json({ message: "見積を削除しました" })
  } catch (error) {
    console.error("Estimate delete error:", error)
    return NextResponse.json({ error: "見積の削除に失敗しました" }, { status: 500 })
  }
}