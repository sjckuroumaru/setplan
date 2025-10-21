import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST - 見積書から発注書作成
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
    
    const orderNumber = `${prefix}${yearMonth}-${String(count + 1).padStart(4, "0")}`

    // 納期を30日後に設定
    const deliveryDate = new Date()
    deliveryDate.setDate(deliveryDate.getDate() + 30)

    // 税額を再計算（8%と10%を分離）
    let subtotal = 0
    let taxAmount8 = 0
    let taxAmount10 = 0
    
    estimate.items.forEach(item => {
      const amount = parseFloat(item.amount.toString())
      subtotal += amount
      
      if (item.taxType === "taxable") {
        // 見積書の税率を使用（デフォルトは10%）
        const taxRate = estimate.taxRate || 10
        if (taxRate === 8) {
          taxAmount8 += amount * 0.08
        } else if (taxRate === 10) {
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

    // 発注書作成
    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId: estimate.customerId,
        honorific: estimate.honorific,
        subject: estimate.subject,
        issueDate: new Date(),
        deliveryDate,
        deliveryLocation: "貴社指定場所",
        paymentTerms: "月末締め翌月末支払い",
        userId: session.user.id,
        taxType: estimate.taxType,
        taxRate: estimate.taxRate,
        roundingType: estimate.roundingType,
        subtotal: subtotal.toString(),
        taxAmount: totalTaxAmount.toString(),
        taxAmount8: taxAmount8.toString(),
        taxAmount10: taxAmount10.toString(),
        totalAmount: totalAmount.toString(),
        remarks: estimate.remarks || "",
        status: "draft",
        items: {
          create: estimate.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            taxType: item.taxType,
            taxRate: estimate.taxRate || 10,
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

    return NextResponse.json({ purchaseOrder })
  } catch (error) {
    console.error("Purchase order create from estimate error:", error)
    return NextResponse.json({ error: "見積書から発注書の作成に失敗しました" }, { status: 500 })
  }
}