import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { renderToBuffer } from "@react-pdf/renderer"
import { OrderConfirmationTemplate } from "@/components/pdf/order-confirmation-template"

// GET - 発注請書PDF生成
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

    // 発注請書を取得
    const orderConfirmation = await prisma.orderConfirmation.findUnique({
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

    if (!orderConfirmation) {
      return NextResponse.json({ error: "発注請書が見つかりません" }, { status: 404 })
    }

    // Decimalを数値に変換
    const formattedOrderConfirmation = {
      ...orderConfirmation,
      subtotal: Number(orderConfirmation.subtotal),
      taxAmount: Number(orderConfirmation.taxAmount),
      taxAmount8: Number(orderConfirmation.taxAmount8),
      taxAmount10: Number(orderConfirmation.taxAmount10),
      totalAmount: Number(orderConfirmation.totalAmount),
      items: orderConfirmation.items.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        amount: Number(item.amount),
      })),
    }

    // PDFを生成
    const pdfBuffer = await renderToBuffer(
      OrderConfirmationTemplate({
        orderConfirmation: formattedOrderConfirmation,
      })
    )

    // レスポンスヘッダーを設定
    const headers = new Headers()
    headers.set("Content-Type", "application/pdf")
    headers.set("Content-Disposition", `attachment; filename="${orderConfirmation.confirmationNumber}.pdf"`)

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error("Order confirmation PDF generation error:", error)
    return NextResponse.json({ error: "PDF生成に失敗しました" }, { status: 500 })
  }
}
