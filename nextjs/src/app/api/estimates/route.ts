import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateAmounts } from "@/lib/utils/document"
import { EstimateFormSchema } from "@/lib/validations/document"
import { z } from "zod"
import { Decimal } from "@prisma/client/runtime/library"

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

    // 全ユーザーが全ての見積書を閲覧可能
    // （編集・削除は別途制限）

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

    // セッションのユーザーが存在するか確認
    const sessionUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!sessionUser || sessionUser.status !== "active") {
      return NextResponse.json({ error: "ユーザーが見つからないか、無効になっています" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = EstimateFormSchema.parse(body)

    // 見積番号を生成 (YYYY-MM-NNNN形式)
    const date = new Date()
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

    // 今月の見積数を取得
    const estimateCount = await prisma.estimate.count({
      where: {
        estimateNumber: {
          startsWith: yearMonth
        }
      }
    })
    const sequenceNumber = String(estimateCount + 1).padStart(4, "0")
    const estimateNumber = `${yearMonth}-${sequenceNumber}`

    // 日付の処理
    const issueDate = validatedData.issueDate 
      ? new Date(validatedData.issueDate) 
      : new Date()
    
    const validUntil = validatedData.validUntil
      ? new Date(validatedData.validUntil)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // デフォルトは1ヶ月後

    // 金額計算
    const calculationResult = calculateAmounts(
      validatedData.items.map((item, index) => ({
        ...item,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        amount: item.amount || (parseFloat(item.quantity.toString()) * parseFloat(item.unitPrice.toString())).toString(),
        taxRate: item.taxRate || validatedData.taxRate,
        displayOrder: item.displayOrder ?? index
      })),
      {
        taxType: validatedData.taxType,
        taxRate: validatedData.taxRate,
        roundingType: validatedData.roundingType
      }
    )
    const { subtotal, taxAmount, totalAmount } = calculationResult

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
          status: "draft",
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
          amount: new Decimal(item.quantity * item.unitPrice),
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