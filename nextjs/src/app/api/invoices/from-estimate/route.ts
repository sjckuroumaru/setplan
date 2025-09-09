import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST - 見積書から請求書作成
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const body = await request.json()
    const { estimateId } = body

    if (!estimateId) {
      return NextResponse.json({ error: "見積書IDが必要です" }, { status: 400 })
    }

    // 見積書を取得
    const estimate = await prisma.estimate.findUnique({
      where: { id: estimateId },
      include: {
        customer: true,
        items: {
          orderBy: { displayOrder: "asc" },
        },
      },
    })

    if (!estimate) {
      return NextResponse.json({ error: "見積書が見つかりません" }, { status: 404 })
    }

    // 既に請求書が作成されている場合はエラー
    const existingInvoice = await prisma.invoice.findFirst({
      where: { estimateId },
    })

    if (existingInvoice) {
      return NextResponse.json({ error: "この見積書から既に請求書が作成されています" }, { status: 400 })
    }

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
    
    const invoiceNumber = `${prefix}${yearMonth}-${String(count + 1).padStart(4, "0")}`

    // 支払期限を翌月末日に設定
    const dueDate = new Date()
    dueDate.setMonth(dueDate.getMonth() + 1)
    dueDate.setMonth(dueDate.getMonth() + 1, 0) // 翌月の最終日

    // 税額を再計算（8%と10%を分離）
    let subtotal = 0
    let taxAmount8 = 0
    let taxAmount10 = 0
    
    estimate.items.forEach(item => {
      const amount = parseFloat(item.amount.toString())
      subtotal += amount
      
      if (item.taxType === "taxable") {
        // 見積書には税率が保存されていないので、デフォルトで10%とする
        // 実際の実装では、itemにtaxRateフィールドを追加することを推奨
        const taxRate = 10
        if (taxRate === 10) {
          taxAmount10 += amount * 0.1
        }
      }
    })

    // 端数処理
    const roundingFn = estimate.roundingType === "floor" ? Math.floor :
                       estimate.roundingType === "ceil" ? Math.ceil : Math.round
    
    taxAmount8 = roundingFn(taxAmount8)
    taxAmount10 = roundingFn(taxAmount10)
    const totalTaxAmount = taxAmount8 + taxAmount10
    const totalAmount = subtotal + totalTaxAmount

    // 請求書作成
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        estimateId: estimate.id,
        customerId: estimate.customerId,
        honorific: estimate.honorific,
        subject: estimate.subject,
        issueDate: new Date(),
        dueDate,
        userId: session.user.id,
        taxType: estimate.taxType,
        taxRate: estimate.taxRate,
        roundingType: estimate.roundingType,
        subtotal: subtotal.toString(),
        taxAmount: totalTaxAmount.toString(),
        taxAmount8: taxAmount8.toString(),
        taxAmount10: taxAmount10.toString(),
        totalAmount: totalAmount.toString(),
        remarks: "お振り込み手数料はお客様ご負担にてお願いいたします。",
        status: "draft",
        items: {
          create: estimate.items.map((item, index) => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            taxType: item.taxType,
            taxRate: 10, // デフォルト税率
            amount: item.amount,
            remarks: item.remarks,
            displayOrder: item.displayOrder,
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

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error("Invoice create from estimate error:", error)
    return NextResponse.json({ error: "見積書から請求書の作成に失敗しました" }, { status: 500 })
  }
}