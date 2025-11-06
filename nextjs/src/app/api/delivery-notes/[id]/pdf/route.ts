import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { renderToBuffer } from "@react-pdf/renderer"
import { DeliveryNotePDF } from "@/components/pdf/delivery-note-pdf"
import React from "react"

// GET - PDF生成
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
    // 納品書を取得
    const deliveryNote = await prisma.deliveryNote.findUnique({
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

    if (!deliveryNote) {
      return NextResponse.json({ error: "納品書が見つかりません" }, { status: 404 })
    }

    // 権限チェック（管理者または作成者のみ）
    if (!session.user.isAdmin && deliveryNote.userId !== session.user.id) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 })
    }

    // 自社情報を取得
    const company = await prisma.company.findFirst()

    // PDFデータの準備
    const pdfData = {
      deliveryNote: {
        deliveryNoteNumber: deliveryNote.deliveryNoteNumber,
        deliveryDate: deliveryNote.deliveryDate.toISOString(),
        honorific: deliveryNote.honorific,
        subject: deliveryNote.subject,
        subtotal: deliveryNote.subtotal.toString(),
        taxAmount: deliveryNote.taxAmount.toString(),
        taxAmount8: deliveryNote.taxAmount8.toString(),
        taxAmount10: deliveryNote.taxAmount10.toString(),
        totalAmount: deliveryNote.totalAmount.toString(),
        remarks: deliveryNote.remarks || undefined,
        items: deliveryNote.items.map(item => ({
          name: item.name,
          quantity: item.quantity.toString(),
          unit: item.unit || undefined,
          unitPrice: item.unitPrice.toString(),
          amount: item.amount.toString(),
        })),
      },
      customer: {
        name: deliveryNote.customer.name,
        postalCode: deliveryNote.customer.postalCode || undefined,
        address: deliveryNote.customer.address || undefined,
        building: deliveryNote.customer.building || undefined,
      },
      company: company ? {
        name: company.name,
        postalCode: company.postalCode || undefined,
        address: company.address || undefined,
        building: company.building || undefined,
        representative: company.representative || undefined,
        phone: company.phone || undefined,
        fax: company.fax || undefined,
        sealImagePath: company.sealImagePath || undefined,
        qualifiedInvoiceNumber: company.qualifiedInvoiceNumber || undefined,
      } : null,
    }

    // PDF生成
    const pdfBuffer = await renderToBuffer(React.createElement(DeliveryNotePDF, pdfData) as any)

    // レスポンスヘッダーの設定
    const headers = new Headers()
    headers.set("Content-Type", "application/pdf")
    headers.set("Content-Disposition", `attachment; filename="${deliveryNote.deliveryNoteNumber}.pdf"`)

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error("PDF generation error:", error)
    return NextResponse.json({ error: "PDF生成に失敗しました" }, { status: 500 })
  }
}
