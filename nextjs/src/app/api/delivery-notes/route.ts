import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { calculateAmounts } from "@/lib/utils/document"
import { DeliveryNoteFormSchema } from "@/lib/validations/document"

// GET - 納品書一覧取得
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
    const customerId = searchParams.get("customerId")
    const search = searchParams.get("search")
    const offset = (page - 1) * limit

    const where: any = {}

    // ステータスフィルタ
    if (status && status !== "all") {
      where.status = status
    }

    // 顧客フィルタ
    if (customerId) {
      where.customerId = customerId
    }

    // 検索
    if (search) {
      where.OR = [
        { deliveryNoteNumber: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
      ]
    }

    // 全ユーザーが全ての納品書を閲覧可能
    // （編集・削除は別途制限）

    const [deliveryNotes, total] = await Promise.all([
      prisma.deliveryNote.findMany({
        where,
        include: {
          customer: true,
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
      prisma.deliveryNote.count({ where }),
    ])

    return NextResponse.json({
      deliveryNotes,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("DeliveryNote fetch error:", error)
    return NextResponse.json({ error: "納品書の取得に失敗しました" }, { status: 500 })
  }
}

// POST - 納品書新規作成
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
    const validatedData = DeliveryNoteFormSchema.parse(body)

    // 納品書番号の生成 (YYYY-MM-NNN形式)
    const date = new Date()
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

    // 今月の納品書数を取得
    const count = await prisma.deliveryNote.count({
      where: {
        deliveryNoteNumber: {
          startsWith: yearMonth,
        },
      },
    })

    const sequenceNumber = String(count + 1).padStart(3, "0")
    const deliveryNoteNumber = `${yearMonth}-${sequenceNumber}`

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

    // 納品書作成
    const deliveryNote = await prisma.deliveryNote.create({
      data: {
        deliveryNoteNumber,
        customerId: validatedData.customerId,
        honorific: validatedData.honorific || "御中",
        subject: validatedData.subject,
        deliveryDate: new Date(validatedData.deliveryDate),
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

    return NextResponse.json({ deliveryNote })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 })
    }
    console.error("DeliveryNote create error:", error)
    return NextResponse.json({ error: "納品書の作成に失敗しました" }, { status: 500 })
  }
}
