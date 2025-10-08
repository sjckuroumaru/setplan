import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

// バリデーションスキーマ
const createUserSchema = z.object({
  employeeNumber: z.string().min(1, "社員番号は必須です"),
  username: z.string().min(1, "ユーザー名は必須です"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(6, "パスワードは6文字以上で入力してください"),
  lastName: z.string().min(1, "姓は必須です"),
  firstName: z.string().min(1, "名は必須です"),
  department: z.string().optional(), // 旧フィールド（後方互換性のため残す）
  departmentId: z.string().nullable().optional(),
  isAdmin: z.boolean().default(false),
})

// 管理者権限チェック
async function checkAdminPermission() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user.isAdmin) {
    return false
  }
  
  return true
}

// GET - ユーザー一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""
    const department = searchParams.get("department") || ""
    const status = searchParams.get("status") || ""
    const basic = searchParams.get("basic") === "true" // 基本情報のみ取得するフラグ

    // 基本情報のみの場合は、権限チェックをスキップ
    // それ以外の場合は管理者権限が必要
    if (!basic && !session.user.isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 })
    }

    const skip = (page - 1) * limit

    // フィルター条件
    const where: any = {}

    if (search) {
      where.OR = [
        { employeeNumber: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
      ]
    }

    // 部署フィルター（旧departmentフィールドとの互換性維持）
    if (department && department !== "all") {
      where.OR = [
        { department: department },
        { departmentId: department }
      ]
    }

    // ステータスフィルター：デフォルトでactiveのみ表示
    where.status = status || "active"

    // 基本情報のみの場合は、限定的なフィールドを返す
    const selectFields = basic ? {
      id: true,
      employeeNumber: true,
      lastName: true,
      firstName: true,
      status: true,
    } : {
      id: true,
      employeeNumber: true,
      username: true,
      email: true,
      lastName: true,
      firstName: true,
      department: true,
      departmentId: true,
      departmentRef: {
        select: {
          id: true,
          name: true,
        }
      },
      isAdmin: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: selectFields,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.warn("User list error:", error)
    return NextResponse.json({ error: "ユーザー一覧の取得に失敗しました" }, { status: 500 })
  }
}

// POST - 新規ユーザー作成
export async function POST(request: NextRequest) {
  try {
    const isAdmin = await checkAdminPermission()
    if (!isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createUserSchema.parse(body)

    // departmentIdが指定されている場合、部署の存在確認
    if (validatedData.departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: validatedData.departmentId },
      })

      if (!department) {
        return NextResponse.json({ error: "指定された部署が見つかりません" }, { status: 400 })
      }
    }

    // 重複チェック
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { employeeNumber: validatedData.employeeNumber },
          { username: validatedData.username },
          { email: validatedData.email },
        ],
      },
    })

    if (existingUser) {
      let errorMessage = "既に登録されています："
      if (existingUser.employeeNumber === validatedData.employeeNumber) {
        errorMessage += "社員番号"
      } else if (existingUser.username === validatedData.username) {
        errorMessage += "ユーザー名"
      } else if (existingUser.email === validatedData.email) {
        errorMessage += "メールアドレス"
      }

      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    // パスワードのハッシュ化
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    const user = await prisma.user.create({
      data: {
        ...validatedData,
        password: hashedPassword,
      },
      select: {
        id: true,
        employeeNumber: true,
        username: true,
        email: true,
        lastName: true,
        firstName: true,
        department: true,
        departmentId: true,
        departmentRef: {
          select: {
            id: true,
            name: true,
          }
        },
        isAdmin: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    
    console.warn("User creation error:", error)
    return NextResponse.json({ error: "ユーザーの作成に失敗しました" }, { status: 500 })
  }
}