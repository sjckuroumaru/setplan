import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { renderToBuffer } from "@react-pdf/renderer"
import { InvoicePDF } from "@/components/pdf/invoice-pdf"
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
    // 請求書を取得
    const invoice = await prisma.invoice.findUnique({
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

    if (!invoice) {
      return NextResponse.json({ error: "請求書が見つかりません" }, { status: 404 })
    }

    // 権限チェック（管理者または作成者のみ）
    if (!session.user.isAdmin && invoice.userId !== session.user.id) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 })
    }

    // 自社情報を取得
    const company = await prisma.company.findFirst()

    // PDFデータの準備
    const pdfData = {
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate.toISOString(),
        dueDate: invoice.dueDate.toISOString(),
        honorific: invoice.honorific,
        subject: invoice.subject,
        subtotal: invoice.subtotal.toString(),
        taxAmount: invoice.taxAmount.toString(),
        taxAmount8: invoice.taxAmount8.toString(),
        taxAmount10: invoice.taxAmount10.toString(),
        totalAmount: invoice.totalAmount.toString(),
        remarks: invoice.remarks || undefined,
        items: invoice.items.map(item => ({
          name: item.name,
          quantity: item.quantity.toString(),
          unit: item.unit || undefined,
          unitPrice: item.unitPrice.toString(),
          amount: item.amount.toString(),
        })),
      },
      customer: {
        name: invoice.customer.name,
        postalCode: invoice.customer.postalCode || undefined,
        address: invoice.customer.address || undefined,
        building: invoice.customer.building || undefined,
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
        bankName: company.bankName || undefined,
        branchName: company.branchName || undefined,
        accountType: company.accountType || undefined,
        accountNumber: company.accountNumber || undefined,
        accountHolder: company.accountHolder || undefined,
      } : null,
    }

    // PDF生成
    const pdfBuffer = await renderToBuffer(React.createElement(InvoicePDF, pdfData) as any)

    // レスポンスヘッダーの設定
    const headers = new Headers()
    headers.set("Content-Type", "application/pdf")
    headers.set("Content-Disposition", `attachment; filename="${invoice.invoiceNumber}.pdf"`)

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error("PDF generation error:", error)
    return NextResponse.json({ error: "PDF生成に失敗しました" }, { status: 500 })
  }
}