import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { generateDocumentNumber, calculateAmounts, isOverdue } from "@/lib/utils/document"
import { InvoiceFormSchema } from "@/lib/validations/document"

// GET - 請求書一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    console.log("Invoice API - Session:", session ? "Found" : "Not found")
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
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
      ]
    }

    // 全ユーザーが全ての請求書を閲覧可能
    // （編集・削除は別途制限）

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
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
      prisma.invoice.count({ where }),
    ])

    // 期限超過の自動判定
    const invoicesWithOverdue = invoices.map(invoice => {
      if (invoice.status === "sent" && isOverdue(invoice.dueDate)) {
        return { ...invoice, status: "overdue" }
      }
      return invoice
    })

    return NextResponse.json({
      invoices: invoicesWithOverdue,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("Invoice fetch error:", error)
    return NextResponse.json({ error: "請求書の取得に失敗しました" }, { status: 500 })
  }
}

// POST - 請求書新規作成
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
    const validatedData = InvoiceFormSchema.parse(body)

    // 請求書番号の生成
    const prefix = "INV-"
    const date = new Date()
    const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`
    
    // 今月の請求書数を取得
    const count = await prisma.invoice.count({
      where: {
        invoiceNumber: {
          startsWith: `${prefix}${yearMonth}`,
        },
      },
    })
    
    const invoiceNumber = generateDocumentNumber(prefix, count)

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

    // 請求書作成
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: validatedData.customerId,
        honorific: validatedData.honorific || "御中",
        subject: validatedData.subject,
        issueDate: new Date(validatedData.issueDate),
        dueDate: new Date(validatedData.dueDate),
        userId: session.user.id,
        taxType: validatedData.taxType,
        taxRate: validatedData.taxRate,
        roundingType: validatedData.roundingType,
        subtotal: subtotal.toString(),
        taxAmount: totalTaxAmount.toString(),
        taxAmount8: taxAmount8.toString(),
        taxAmount10: taxAmount10.toString(),
        totalAmount: totalAmount.toString(),
        remarks: validatedData.remarks || "お振り込み手数料はお客様ご負担にてお願いいたします。",
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

    return NextResponse.json({ invoice })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 })
    }
    console.error("Invoice create error:", error)
    return NextResponse.json({ error: "請求書の作成に失敗しました" }, { status: 500 })
  }
}