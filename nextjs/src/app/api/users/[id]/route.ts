import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

// 更新用スキーマ（パスワードはオプション）
const updateUserSchema = z.object({
  employeeNumber: z.string().min(1, "社員番号は必須です"),
  username: z.string().min(1, "ユーザー名は必須です"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(6, "パスワードは6文字以上で入力してください").optional(),
  lastName: z.string().min(1, "姓は必須です"),
  firstName: z.string().min(1, "名は必須です"),
  department: z.string().optional(),
  isAdmin: z.boolean().default(false),
  status: z.enum(["active", "inactive"]).default("active"),
})

async function checkAdminPermission() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user.isAdmin) {
    return false
  }
  
  return true
}

// GET - 個別ユーザー取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await checkAdminPermission()
    if (!isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 })
    }

    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        employeeNumber: true,
        username: true,
        email: true,
        lastName: true,
        firstName: true,
        department: true,
        isAdmin: true,
        status: true,
        sealImagePath: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.warn("User fetch error:", error)
    return NextResponse.json({ error: "ユーザー情報の取得に失敗しました" }, { status: 500 })
  }
}

// PUT - ユーザー更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await checkAdminPermission()
    if (!isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateUserSchema.parse(body)

    // 存在チェック
    const existingUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!existingUser) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 })
    }

    // 重複チェック（自分以外）
    const duplicateUser = await prisma.user.findFirst({
      where: {
        AND: [
          { id: { not: id } },
          {
            OR: [
              { employeeNumber: validatedData.employeeNumber },
              { username: validatedData.username },
              { email: validatedData.email },
            ],
          },
        ],
      },
    })

    if (duplicateUser) {
      let errorMessage = "既に登録されています："
      if (duplicateUser.employeeNumber === validatedData.employeeNumber) {
        errorMessage += "社員番号"
      } else if (duplicateUser.username === validatedData.username) {
        errorMessage += "ユーザー名"
      } else if (duplicateUser.email === validatedData.email) {
        errorMessage += "メールアドレス"
      }
      
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    // 更新データの準備
    const updateData: any = {
      employeeNumber: validatedData.employeeNumber,
      username: validatedData.username,
      email: validatedData.email,
      lastName: validatedData.lastName,
      firstName: validatedData.firstName,
      department: validatedData.department,
      isAdmin: validatedData.isAdmin,
      status: validatedData.status,
    }

    // パスワードが提供された場合のみ更新
    if (validatedData.password) {
      updateData.password = await bcrypt.hash(validatedData.password, 10)
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        employeeNumber: true,
        username: true,
        email: true,
        lastName: true,
        firstName: true,
        department: true,
        isAdmin: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ user })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    
    console.warn("User update error:", error)
    return NextResponse.json({ error: "ユーザーの更新に失敗しました" }, { status: 500 })
  }
}

// DELETE - ユーザー削除（論理削除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await checkAdminPermission()
    if (!isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 })
    }

    const { id } = await params
    const session = await getServerSession(authOptions)
    
    // 自分自身の削除は禁止
    if (session?.user?.id === id) {
      return NextResponse.json({ error: "自分自身を削除することはできません" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 })
    }

    // ステータスをinactiveに変更（論理削除）
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: "inactive" },
    })

    console.log(`User ${updatedUser.username} status updated to inactive`)
    return NextResponse.json({ message: "ユーザーを削除しました" })
  } catch (error) {
    console.warn("User deletion error:", error)
    return NextResponse.json({ error: "ユーザーの削除に失敗しました" }, { status: 500 })
  }
}