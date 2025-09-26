import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// 更新用スキーマ
const updateProjectSchema = z.object({
  projectNumber: z.string().min(1, "案件番号は必須です").max(50, "案件番号は50文字以内で入力してください"),
  projectName: z.string().min(1, "案件名は必須です").max(255, "案件名は255文字以内で入力してください"),
  description: z.string().max(10000, "説明は10000文字以内で入力してください").optional(),
  status: z.enum(["planning", "developing", "active", "suspended", "completed"]),
  plannedStartDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
  actualStartDate: z.string().optional(),
  actualEndDate: z.string().optional(),
  budget: z.number().optional(),
  hourlyRate: z.number().optional(),
})

async function checkAdminPermission() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user.isAdmin) {
    return false
  }
  
  return true
}

// GET - 個別案件取得
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

    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        projectNumber: true,
        projectName: true,
        description: true,
        status: true,
        plannedStartDate: true,
        plannedEndDate: true,
        actualStartDate: true,
        actualEndDate: true,
        budget: true,
        hourlyRate: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!project) {
      return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 })
    }

    return NextResponse.json({ project })
  } catch (error) {
    console.warn("Project fetch error:", error)
    return NextResponse.json({ error: "案件情報の取得に失敗しました" }, { status: 500 })
  }
}

// PUT - 案件更新
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
    const validatedData = updateProjectSchema.parse(body)

    // 存在チェック
    const existingProject = await prisma.project.findUnique({
      where: { id },
    })

    if (!existingProject) {
      return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 })
    }

    // 重複チェック（自分以外）
    const duplicateProject = await prisma.project.findFirst({
      where: {
        AND: [
          { id: { not: id } },
          { projectNumber: validatedData.projectNumber },
        ],
      },
    })

    if (duplicateProject) {
      return NextResponse.json({ error: "案件番号が既に存在します" }, { status: 400 })
    }

    // 更新データの準備
    const updateData: any = {
      projectNumber: validatedData.projectNumber,
      projectName: validatedData.projectName,
      description: validatedData.description,
      status: validatedData.status,
    }

    // 予算フィールドの設定
    if (validatedData.budget !== undefined) {
      updateData.budget = validatedData.budget
    }
    if (validatedData.hourlyRate !== undefined) {
      updateData.hourlyRate = validatedData.hourlyRate
    }

    // 日付フィールドの変換
    if (validatedData.plannedStartDate) {
      updateData.plannedStartDate = new Date(validatedData.plannedStartDate)
    }
    if (validatedData.plannedEndDate) {
      updateData.plannedEndDate = new Date(validatedData.plannedEndDate)
    }
    if (validatedData.actualStartDate) {
      updateData.actualStartDate = new Date(validatedData.actualStartDate)
    }
    if (validatedData.actualEndDate) {
      updateData.actualEndDate = new Date(validatedData.actualEndDate)
    }

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        projectNumber: true,
        projectName: true,
        description: true,
        status: true,
        plannedStartDate: true,
        plannedEndDate: true,
        actualStartDate: true,
        actualEndDate: true,
        budget: true,
        hourlyRate: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ project })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    
    console.warn("Project update error:", error)
    return NextResponse.json({ error: "案件の更新に失敗しました" }, { status: 500 })
  }
}

// DELETE - 案件削除
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

    const project = await prisma.project.findUnique({
      where: { id },
    })

    if (!project) {
      return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 })
    }

    // 関連データの確認
    const relatedSchedulePlans = await prisma.schedulePlan.count({
      where: { projectId: id },
    })
    
    const relatedScheduleActuals = await prisma.scheduleActual.count({
      where: { projectId: id },
    })
    
    const relatedSchedules = relatedSchedulePlans + relatedScheduleActuals

    const relatedIssues = await prisma.issue.count({
      where: { projectId: id },
    })

    if (relatedSchedules > 0 || relatedIssues > 0) {
      return NextResponse.json({ 
        error: "関連する予定実績または課題が存在するため削除できません" 
      }, { status: 400 })
    }

    // 物理削除（関連データがない場合）
    await prisma.project.delete({
      where: { id },
    })

    console.log(`Project ${project.projectName} deleted`)
    return NextResponse.json({ message: "案件を削除しました" })
  } catch (error) {
    console.warn("Project deletion error:", error)
    return NextResponse.json({ error: "案件の削除に失敗しました" }, { status: 500 })
  }
}