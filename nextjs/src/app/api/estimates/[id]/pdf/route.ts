import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { renderToBuffer } from "@react-pdf/renderer"
import { EstimatePDF } from "@/components/pdf/estimate-pdf"
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
    // 見積データ取得
    const estimate = await prisma.estimate.findUnique({
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

    if (!estimate) {
      return NextResponse.json({ error: "見積が見つかりません" }, { status: 404 })
    }

    // 管理者以外は自分の見積のみ閲覧可能
    if (!session.user.isAdmin && estimate.userId !== session.user.id) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 })
    }

    // 自社情報取得
    const company = await prisma.company.findFirst()

    // PDFデータの準備
    const pdfData = {
      estimate: {
        estimateNumber: estimate.estimateNumber,
        issueDate: estimate.issueDate.toISOString(),
        validUntil: estimate.validUntil.toISOString(),
        customer: {
          name: estimate.customer.name,
          postalCode: estimate.customer.postalCode,
          address: estimate.customer.address,
          building: estimate.customer.building,
          representative: estimate.customer.representative,
        },
        honorific: estimate.honorific,
        subject: estimate.subject,
        subtotal: estimate.subtotal.toString(),
        taxAmount: estimate.taxAmount.toString(),
        totalAmount: estimate.totalAmount.toString(),
        taxRate: estimate.taxRate,
        taxType: estimate.taxType,
        remarks: estimate.remarks,
        items: estimate.items.map(item => ({
          name: item.name,
          quantity: item.quantity.toString(),
          unit: item.unit,
          unitPrice: item.unitPrice.toString(),
          taxType: item.taxType,
          amount: item.amount.toString(),
        })),
      },
      company: company ? {
        name: company.name,
        postalCode: company.postalCode,
        address: company.address,
        building: company.building,
        representative: company.representative,
        phone: company.phone,
        fax: company.fax,
        sealImagePath: company.sealImagePath,
      } : null,
      user: {
        lastName: estimate.user.lastName,
        firstName: estimate.user.firstName,
        sealImagePath: estimate.user.sealImagePath,
      },
    }

    // PDF生成
    const pdfBuffer = await renderToBuffer(React.createElement(EstimatePDF, pdfData) as any)

    // レスポンスヘッダーの設定
    const headers = new Headers()
    headers.set("Content-Type", "application/pdf")
    headers.set("Content-Disposition", `attachment; filename="estimate-${estimate.estimateNumber}.pdf"`)

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error("PDF generation error:", error)
    return NextResponse.json({ error: "PDF生成に失敗しました" }, { status: 500 })
  }
}