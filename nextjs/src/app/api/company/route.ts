import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const CompanySchema = z.object({
  name: z.string().min(1, "会社名は必須です"),
  postalCode: z.string().optional(),
  address: z.string().optional(),
  building: z.string().optional(),
  representative: z.string().optional(),
  phone: z.string().optional(),
  fax: z.string().optional(),
  remarks: z.string().optional(),
})

// GET - 自社情報取得
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    // 自社情報を取得（1件のみ）
    const company = await prisma.company.findFirst()

    if (!company) {
      return NextResponse.json({ company: null })
    }

    return NextResponse.json({ company })
  } catch (error) {
    console.error("Company fetch error:", error)
    return NextResponse.json({ error: "自社情報の取得に失敗しました" }, { status: 500 })
  }
}

// PUT - 自社情報更新（作成も含む）
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    // 管理者権限チェック
    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = CompanySchema.parse(body)

    // 既存の自社情報を確認
    const existingCompany = await prisma.company.findFirst()

    let company
    if (existingCompany) {
      // 更新
      company = await prisma.company.update({
        where: { id: existingCompany.id },
        data: validatedData,
      })
    } else {
      // 新規作成
      company = await prisma.company.create({
        data: validatedData,
      })
    }

    return NextResponse.json({ company })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 })
    }
    console.error("Company update error:", error)
    return NextResponse.json({ error: "自社情報の更新に失敗しました" }, { status: 500 })
  }
}