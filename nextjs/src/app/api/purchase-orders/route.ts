import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { generateDocumentNumber, calculateAmounts } from "@/lib/utils/document"
import { PurchaseOrderFormSchema } from "@/lib/validations/document"

// GET - 発注書一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const status = searchParams.get("status")
    const supplierId = searchParams.get("supplierId")
    const search = searchParams.get("search")
    const offset = (page - 1) * limit

    const where: any = {}
    
    // ステータスフィルタ
    if (status && status !== "all") {
      where.status = status
    }

    // 発注先フィルタ
    if (supplierId) {
      where.supplierId = supplierId
    }

    // 検索
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
        { supplier: { name: { contains: search, mode: "insensitive" } } },
      ]
    }

    // 全ユーザーが全ての発注書を閲覧可能
    // （編集・削除は別途制限）

    const [purchaseOrders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: true,
          user: {
            select: {
              id: true,
              lastName: true,
              firstName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.purchaseOrder.count({ where }),
    ])

    return NextResponse.json({
      purchaseOrders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("Purchase order fetch error:", error)
    return NextResponse.json({ error: "発注書の取得に失敗しました" }, { status: 500 })
  }
}

// POST - 発注書新規作成
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
    const validatedData = PurchaseOrderFormSchema.parse(body)

    // 発注書番号の生成
    const prefix = "PO-"
    const date = new Date()
    const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`
    
    // 今月の発注書数を取得
    const count = await prisma.purchaseOrder.count({
      where: {
        orderNumber: {
          startsWith: `${prefix}${yearMonth}`,
        },
      },
    })
    
    const orderNumber = generateDocumentNumber(prefix, count)

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

    const items = validatedData.items.map(item => ({
      ...item,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount || (item.quantity * item.unitPrice).toString(),
    }))

    // 発注書作成
    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId: validatedData.supplierId,
        honorific: validatedData.honorific || "御中",
        subject: validatedData.subject,
        issueDate: new Date(validatedData.issueDate),
        deliveryDate: validatedData.deliveryDate ? new Date(validatedData.deliveryDate) : null,
        completionPeriod: validatedData.completionPeriod,
        deliveryLocation: validatedData.deliveryLocation,
        paymentTerms: validatedData.paymentTerms,
        userId: session.user.id,
        taxType: validatedData.taxType,
        taxRate: validatedData.taxRate,
        roundingType: validatedData.roundingType,
        subtotal: subtotal.toString(),
        taxAmount: totalTaxAmount.toString(),
        taxAmount8: taxAmount8.toString(),
        taxAmount10: taxAmount10.toString(),
        totalAmount: totalAmount.toString(),
        remarks: validatedData.remarks,
        status: "draft",
        items: {
          create: items,
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

    return NextResponse.json({ purchaseOrder })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 })
    }
    console.error("Purchase order create error:", error)
    return NextResponse.json({ error: "発注書の作成に失敗しました" }, { status: 500 })
  }
}