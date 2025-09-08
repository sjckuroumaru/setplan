import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateEstimateNumber } from "@/lib/estimate-number"
import { calculateEstimateAmount } from "@/lib/estimate-calc"
import { z } from "zod"
import { Decimal } from "@prisma/client/runtime/library"

const EstimateItemSchema = z.object({
  name: z.string().min(1, "項目名は必須です"),
  quantity: z.number().positive("数量は正の数である必要があります"),
  unit: z.string().optional(),
  unitPrice: z.number().min(0, "単価は0以上である必要があります"),
  taxType: z.enum(["taxable", "non-taxable", "tax-included"]),
  remarks: z.string().optional(),
  displayOrder: z.number().optional(),
})

const EstimateSchema = z.object({
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

// GET - 見積一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get("customerId")
    const status = searchParams.get("status")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

    // 検索条件の構築
    const where: any = {}
    
    if (customerId) {
      where.customerId = customerId
    }
    
    if (status) {
      where.status = status
    }

    // 管理者以外は自分の見積のみ表示
    if (!session.user.isAdmin) {
      where.userId = session.user.id
    }

    // 見積データ取得
    const [estimates, total] = await Promise.all([
      prisma.estimate.findMany({
        where,
        skip,
        take: limit,
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
        orderBy: { createdAt: "desc" },
      }),
      prisma.estimate.count({ where }),
    ])

    return NextResponse.json({
      estimates,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("Estimates fetch error:", error)
    return NextResponse.json({ error: "見積一覧の取得に失敗しました" }, { status: 500 })
  }
}

// POST - 見積新規作成
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = EstimateSchema.parse(body)

    // 見積番号を生成
    const estimateNumber = await generateEstimateNumber()

    // 日付の処理
    const issueDate = validatedData.issueDate 
      ? new Date(validatedData.issueDate) 
      : new Date()
    
    const validUntil = validatedData.validUntil
      ? new Date(validatedData.validUntil)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // デフォルトは1ヶ月後

    // 金額計算
    const { subtotal, taxAmount, totalAmount } = calculateEstimateAmount(
      validatedData.items,
      validatedData.taxRate,
      validatedData.taxType as "inclusive" | "exclusive",
      validatedData.roundingType as "floor" | "ceil" | "round"
    )

    // トランザクションで見積と明細を作成
    const estimate = await prisma.$transaction(async (tx) => {
      // 見積書作成
      const newEstimate = await tx.estimate.create({
        data: {
          estimateNumber,
          customerId: validatedData.customerId,
          honorific: validatedData.honorific,
          subject: validatedData.subject,
          issueDate,
          validUntil,
          userId: session.user.id,
          taxType: validatedData.taxType,
          taxRate: validatedData.taxRate,
          roundingType: validatedData.roundingType,
          subtotal,
          taxAmount,
          totalAmount,
          remarks: validatedData.remarks || "大幅な内容変更が生じた際には、再度お見積りさせて頂きます。",
          status: validatedData.status,
        },
      })

      // 明細作成
      if (validatedData.items.length > 0) {
        const itemsData = validatedData.items.map((item, index) => ({
          estimateId: newEstimate.id,
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

      // 作成した見積を返す
      return await tx.estimate.findUnique({
        where: { id: newEstimate.id },
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
    console.error("Estimate create error:", error)
    return NextResponse.json({ error: "見積の作成に失敗しました" }, { status: 500 })
  }
}