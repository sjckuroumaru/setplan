import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const CustomerSchema = z.object({
  name: z.string().min(1, "会社名は必須です"),
  postalCode: z.string().optional(),
  address: z.string().optional(),
  building: z.string().optional(),
  representative: z.string().optional(),
  phone: z.string().optional(),
  fax: z.string().optional(),
  remarks: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
})

// GET - 顧客詳細取得
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
    const customer = await prisma.customer.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!customer) {
      return NextResponse.json({ error: "顧客が見つかりません" }, { status: 404 })
    }

    return NextResponse.json({ customer })
  } catch (error) {
    console.error("Customer fetch error:", error)
    return NextResponse.json({ error: "顧客情報の取得に失敗しました" }, { status: 500 })
  }
}

// PUT - 顧客更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const resolvedParams = await params
    const body = await request.json()
    const validatedData = CustomerSchema.parse(body)

    const customer = await prisma.customer.update({
      where: { id: resolvedParams.id },
      data: validatedData,
    })

    return NextResponse.json({ customer })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 })
    }
    console.error("Customer update error:", error)
    return NextResponse.json({ error: "顧客情報の更新に失敗しました" }, { status: 500 })
  }
}

// DELETE - 顧客削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const resolvedParams = await params
    await prisma.customer.delete({
      where: { id: resolvedParams.id },
    })

    return NextResponse.json({ message: "顧客を削除しました" })
  } catch (error: any) {
    console.error("Customer delete error:", error)

    // Prismaの外部キー制約エラー（P2003）をチェック
    if (error.code === "P2003") {
      return NextResponse.json(
        { error: "この顧客に紐づく見積書、発注書、または請求書が存在するため削除できません" },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "顧客の削除に失敗しました" }, { status: 500 })
  }
}