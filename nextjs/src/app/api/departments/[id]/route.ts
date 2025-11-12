import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// バリデーションスキーマ
const updateDepartmentSchema = z.object({
  name: z.string().min(1, "部署・チーム名は必須です"),
  sharedNotes: z.string().max(500, "共有事項は500文字以内で入力してください").optional(),
})

// 管理者権限チェック
async function checkAdminPermission() {
  const session = await getServerSession(authOptions)

  if (!session || !session.user.isAdmin) {
    return false
  }

  return true
}

// GET - 部署詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const { id } = await params

    const basic = request.nextUrl.searchParams.get("basic") === "true"

    const selectFields = basic
      ? {
          id: true,
          name: true,
          sharedNotes: true,
        }
      : {
          id: true,
          name: true,
          sharedNotes: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              users: true,
              projects: true,
            },
          },
        }

    const department = await prisma.department.findUnique({
      where: { id },
      select: selectFields,
    })

    if (!department) {
      return NextResponse.json({ error: "部署が見つかりません" }, { status: 404 })
    }

    return NextResponse.json({ department })
  } catch (error) {
    console.warn("Department fetch error:", error)
    return NextResponse.json({ error: "部署の取得に失敗しました" }, { status: 500 })
  }
}

// PUT - 部署更新
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
    const validatedData = updateDepartmentSchema.parse(body)
    const sharedNotesInput =
      typeof validatedData.sharedNotes === "string"
        ? validatedData.sharedNotes.trim()
        : undefined
    const sharedNotes =
      sharedNotesInput !== undefined
        ? (sharedNotesInput.length > 0 ? sharedNotesInput : null)
        : undefined

    // 部署の存在確認
    const existingDepartment = await prisma.department.findUnique({
      where: { id },
    })

    if (!existingDepartment) {
      return NextResponse.json({ error: "部署が見つかりません" }, { status: 404 })
    }

    // 名前の重複チェック（自分以外）
    const duplicateDepartment = await prisma.department.findFirst({
      where: {
        name: validatedData.name,
        id: { not: id },
      },
    })

    if (duplicateDepartment) {
      return NextResponse.json({ error: "既に同じ名前の部署が登録されています" }, { status: 400 })
    }

    const updateData: {
      name: string
      sharedNotes?: string | null
    } = {
      name: validatedData.name,
    }

    if (sharedNotes !== undefined) {
      updateData.sharedNotes = sharedNotes
    }

    const department = await prisma.department.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        sharedNotes: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ department })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }

    console.warn("Department update error:", error)
    return NextResponse.json({ error: "部署の更新に失敗しました" }, { status: 500 })
  }
}

// DELETE - 部署削除
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

    // 部署の存在確認
    const existingDepartment = await prisma.department.findUnique({
      where: { id },
      select: {
        _count: {
          select: {
            users: true,
            projects: true,
          },
        },
      },
    })

    if (!existingDepartment) {
      return NextResponse.json({ error: "部署が見つかりません" }, { status: 404 })
    }

    // 関連するユーザーまたは案件が存在する場合は削除不可
    if (existingDepartment._count.users > 0 || existingDepartment._count.projects > 0) {
      return NextResponse.json(
        {
          error: "この部署にはユーザーまたは案件が紐付いているため削除できません。先に関連データを削除するか、別の部署に移動してください。"
        },
        { status: 400 }
      )
    }

    await prisma.department.delete({
      where: { id },
    })

    return NextResponse.json({ message: "部署を削除しました" })
  } catch (error) {
    console.warn("Department delete error:", error)
    return NextResponse.json({ error: "部署の削除に失敗しました" }, { status: 500 })
  }
}
