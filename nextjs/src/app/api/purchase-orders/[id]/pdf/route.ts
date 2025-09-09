import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { renderToBuffer } from "@react-pdf/renderer"
import { PurchaseOrderTemplate } from "@/components/pdf/purchase-order-template"

// GET - 発注書PDF生成
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

    // 発注書を取得
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
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

    if (!purchaseOrder) {
      return NextResponse.json({ error: "発注書が見つかりません" }, { status: 404 })
    }


    // Decimalを数値に変換
    const formattedPurchaseOrder = {
      ...purchaseOrder,
      subtotal: Number(purchaseOrder.subtotal),
      taxAmount: Number(purchaseOrder.taxAmount),
      taxAmount8: Number(purchaseOrder.taxAmount8),
      taxAmount10: Number(purchaseOrder.taxAmount10),
      totalAmount: Number(purchaseOrder.totalAmount),
      items: purchaseOrder.items.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        amount: Number(item.amount),
      })),
    }

    // PDFを生成
    const pdfBuffer = await renderToBuffer(
      PurchaseOrderTemplate({
        purchaseOrder: formattedPurchaseOrder,
      })
    )

    // レスポンスヘッダーを設定
    const headers = new Headers()
    headers.set("Content-Type", "application/pdf")
    headers.set("Content-Disposition", `attachment; filename="${purchaseOrder.orderNumber}.pdf"`)

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error("Purchase order PDF generation error:", error)
    return NextResponse.json({ error: "PDF生成に失敗しました" }, { status: 500 })
  }
}