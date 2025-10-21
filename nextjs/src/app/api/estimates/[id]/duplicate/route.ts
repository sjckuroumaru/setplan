import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateDocumentNumber } from "@/lib/utils/document"

// POST - 見積複製
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const resolvedParams = await params

    // セッションのユーザーが存在するか確認
    const sessionUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!sessionUser || sessionUser.status !== "active") {
      return NextResponse.json({ error: "ユーザーが見つからないか、無効になっています" }, { status: 401 })
    }

    // 元の見積を取得
    const originalEstimate = await prisma.estimate.findUnique({
      where: { id: resolvedParams.id },
      include: {
        items: true,
      },
    })

    if (!originalEstimate) {
      return NextResponse.json({ error: "見積が見つかりません" }, { status: 404 })
    }

    // 新しい見積番号を生成
    const prefix = "EST-"
    const date = new Date()
    const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`

    // 今月の見積数を取得
    const estimateCount = await prisma.estimate.count({
      where: {
        estimateNumber: {
          startsWith: `${prefix}${yearMonth}`
        }
      }
    })
    const estimateNumber = generateDocumentNumber(prefix, estimateCount, date)

    // 現在の日付で新規作成
    const now = new Date()
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 1ヶ月後

    // トランザクションで見積と明細を複製
    const duplicatedEstimate = await prisma.$transaction(async (tx) => {
      // 見積書を複製
      const newEstimate = await tx.estimate.create({
        data: {
          estimateNumber,
          customerId: originalEstimate.customerId,
          honorific: originalEstimate.honorific,
          subject: originalEstimate.subject,
          issueDate: now,
          validUntil,
          userId: session.user.id, // 現在のユーザーを担当者に設定
          taxType: originalEstimate.taxType,
          taxRate: originalEstimate.taxRate,
          roundingType: originalEstimate.roundingType,
          subtotal: originalEstimate.subtotal,
          taxAmount: originalEstimate.taxAmount,
          totalAmount: originalEstimate.totalAmount,
          remarks: originalEstimate.remarks,
          status: "draft", // 複製時は必ず下書きステータス
        },
      })

      // 明細を複製
      if (originalEstimate.items.length > 0) {
        const itemsData = originalEstimate.items.map((item) => ({
          estimateId: newEstimate.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          taxType: item.taxType,
          amount: item.amount,
          remarks: item.remarks,
          displayOrder: item.displayOrder,
        }))

        await tx.estimateItem.createMany({
          data: itemsData,
        })
      }

      // 複製した見積を返す
      return await tx.estimate.findUnique({
        where: { id: newEstimate.id },
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
    })

    return NextResponse.json({ 
      estimate: duplicatedEstimate,
      message: "見積を複製しました" 
    })
  } catch (error) {
    console.error("Estimate duplicate error:", error)
    return NextResponse.json({ error: "見積の複製に失敗しました" }, { status: 500 })
  }
}