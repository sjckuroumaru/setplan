import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { renderToBuffer } from "@react-pdf/renderer"
import { InvoiceListPDF } from "@/components/pdf/invoice-list-pdf"
import React from "react"

// POST - 請求書一覧PDF生成
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    // リクエストボディからフィルターパラメータを取得
    const body = await request.json()
    const {
      status,
      search,
      userId,
      issueDateStart,
      issueDateEnd,
      dueDateStart,
      dueDateEnd,
    } = body

    const where: any = {}

    // ステータスフィルタ
    if (status && status !== "all") {
      where.status = status
    }

    // 担当者フィルタ
    if (userId && userId !== "all") {
      where.userId = userId
    }

    // 請求日フィルタ
    if (issueDateStart || issueDateEnd) {
      where.issueDate = {}
      if (issueDateStart) {
        where.issueDate.gte = new Date(issueDateStart)
      }
      if (issueDateEnd) {
        where.issueDate.lte = new Date(issueDateEnd)
      }
    }

    // 支払期限フィルタ
    if (dueDateStart || dueDateEnd) {
      where.dueDate = {}
      if (dueDateStart) {
        where.dueDate.gte = new Date(dueDateStart)
      }
      if (dueDateEnd) {
        where.dueDate.lte = new Date(dueDateEnd)
      }
    }

    // 検索
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
      ]
    }

    // 請求書を全件取得（フィルター適用）
    const invoices = await prisma.invoice.findMany({
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
    })

    // ステータスの優先順位を定義（入金待ち → 入金済 → 下書き）
    const statusOrder: Record<string, number> = {
      sent: 1,
      paid: 2,
      draft: 3,
    }

    // ステータスでソート
    const sortedInvoices = invoices.sort((a, b) => {
      const orderA = statusOrder[a.status] || 999
      const orderB = statusOrder[b.status] || 999
      return orderA - orderB
    })

    // PDFデータの準備
    const pdfData = {
      invoices: sortedInvoices.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customer: {
          name: invoice.customer.name,
        },
        subject: invoice.subject,
        issueDate: invoice.issueDate.toISOString(),
        dueDate: invoice.dueDate.toISOString(),
        totalAmount: invoice.totalAmount.toString(),
        subtotal: invoice.subtotal.toString(),
        taxAmount: invoice.taxAmount.toString(),
        status: invoice.status,
      })),
      generatedDate: new Date().toISOString(),
    }

    // PDF生成
    const pdfBuffer = await renderToBuffer(
      React.createElement(InvoiceListPDF, pdfData) as any
    )

    // レスポンスヘッダーの設定
    const headers = new Headers()
    headers.set("Content-Type", "application/pdf")
    headers.set(
      "Content-Disposition",
      `attachment; filename="invoices-${new Date().toISOString().split("T")[0]}.pdf"`
    )

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error("PDF generation error:", error)
    return NextResponse.json(
      { error: "PDF生成に失敗しました" },
      { status: 500 }
    )
  }
}
