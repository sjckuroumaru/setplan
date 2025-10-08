import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// バリデーションスキーマ
const createDepartmentSchema = z.object({
  name: z.string().min(1, "部署・チーム名は必須です"),
})

// 管理者権限チェック
async function checkAdminPermission() {
  const session = await getServerSession(authOptions)

  if (!session || !session.user.isAdmin) {
    return false
  }

  return true
}

// GET - 部署一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "100") // 部署は件数が少ないと想定
    const search = searchParams.get("search") || ""
    const basic = searchParams.get("basic") === "true" // 基本情報のみ取得するフラグ

    const skip = (page - 1) * limit

    // フィルター条件
    const where: any = {}

    if (search) {
      where.name = { contains: search, mode: "insensitive" }
    }

    // 基本情報のみの場合は、限定的なフィールドを返す
    const selectFields = basic ? {
      id: true,
      name: true,
    } : {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          users: true,
          projects: true,
        },
      },
    }

    const [departments, total] = await Promise.all([
      prisma.department.findMany({
        where,
        select: selectFields,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.department.count({ where }),
    ])

    return NextResponse.json({
      departments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.warn("Department list error:", error)
    return NextResponse.json({ error: "部署一覧の取得に失敗しました" }, { status: 500 })
  }
}

// POST - 新規部署作成
export async function POST(request: NextRequest) {
  try {
    const isAdmin = await checkAdminPermission()
    if (!isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createDepartmentSchema.parse(body)

    // 重複チェック
    const existingDepartment = await prisma.department.findFirst({
      where: {
        name: validatedData.name,
      },
    })

    if (existingDepartment) {
      return NextResponse.json({ error: "既に同じ名前の部署が登録されています" }, { status: 400 })
    }

    const department = await prisma.department.create({
      data: validatedData,
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ department }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }

    console.warn("Department creation error:", error)
    return NextResponse.json({ error: "部署の作成に失敗しました" }, { status: 500 })
  }
}
