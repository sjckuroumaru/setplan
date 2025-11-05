import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { recalculateProjectLaborCost } from "@/lib/project-utils"

// 更新用スキーマ
const updateProjectSchema = z.object({
  projectNumber: z.string().min(1, "案件番号は必須です").max(50, "案件番号は50文字以内で入力してください"),
  projectName: z.string().min(1, "案件名は必須です").max(255, "案件名は255文字以内で入力してください"),
  description: z.string().max(10000, "説明は10000文字以内で入力してください").optional(),
  status: z.enum(["planning", "developing", "active", "suspended", "completed"]),
  departmentId: z.string().nullable().optional(),
  purchaseOrderId: z.string().nullable().optional(),
  plannedStartDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
  actualStartDate: z.string().optional(),
  actualEndDate: z.string().optional(),
  budget: z.number().optional(),
  hourlyRate: z.number().optional(),
  // 実績台帳用の新規フィールド
  projectType: z.enum(["development", "ses", "maintenance", "other"]).optional(),
  deliveryDate: z.string().optional(),
  invoiceableDate: z.string().optional(),
  memo: z.string().max(10000, "メモは10000文字以内で入力してください").optional(),
  outsourcingCost: z.number().min(0, "外注費は0以上で入力してください").optional(),
  serverDomainCost: z.number().min(0, "サーバー・ドメイン代は0以上で入力してください").optional(),
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
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        purchaseOrderId: true,
        purchaseOrder: {
          select: {
            id: true,
            orderNumber: true,
            subject: true,
          },
        },
        plannedStartDate: true,
        plannedEndDate: true,
        actualStartDate: true,
        actualEndDate: true,
        budget: true,
        hourlyRate: true,
        // 実績台帳用の新規フィールド
        projectType: true,
        deliveryDate: true,
        invoiceableDate: true,
        memo: true,
        outsourcingCost: true,
        serverDomainCost: true,
        // 投下工数の集計値
        totalLaborHours: true,
        totalLaborCost: true,
        lastCalculatedAt: true,
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

    // departmentIdが指定されている場合、部署の存在確認
    if (validatedData.departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: validatedData.departmentId },
      })

      if (!department) {
        return NextResponse.json({ error: "指定された部署が見つかりません" }, { status: 400 })
      }
    }

    // purchaseOrderIdが指定されている場合、発注書の存在確認
    if (validatedData.purchaseOrderId) {
      const purchaseOrder = await prisma.purchaseOrder.findUnique({
        where: { id: validatedData.purchaseOrderId },
      })

      if (!purchaseOrder) {
        return NextResponse.json({ error: "指定された発注書が見つかりません" }, { status: 400 })
      }
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

    // hourlyRate変更チェック（集計値再計算用）
    const hourlyRateChanged = validatedData.hourlyRate !== undefined &&
                               validatedData.hourlyRate !== (existingProject.hourlyRate ? Number(existingProject.hourlyRate) : null)

    // 更新データの準備
    const updateData: any = {
      projectNumber: validatedData.projectNumber,
      projectName: validatedData.projectName,
      description: validatedData.description,
      status: validatedData.status,
      departmentId: validatedData.departmentId === null ? null : validatedData.departmentId,
      purchaseOrderId: validatedData.purchaseOrderId === null ? null : validatedData.purchaseOrderId,
    }

    // 予算フィールドの設定
    if (validatedData.budget !== undefined) {
      updateData.budget = validatedData.budget
    }
    if (validatedData.hourlyRate !== undefined) {
      updateData.hourlyRate = validatedData.hourlyRate
    }

    // 実績台帳用の新規フィールドの設定
    if (validatedData.projectType !== undefined) {
      updateData.projectType = validatedData.projectType
    }
    if (validatedData.outsourcingCost !== undefined) {
      updateData.outsourcingCost = validatedData.outsourcingCost
    }
    if (validatedData.serverDomainCost !== undefined) {
      updateData.serverDomainCost = validatedData.serverDomainCost
    }
    if (validatedData.memo !== undefined) {
      updateData.memo = validatedData.memo
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
    if (validatedData.deliveryDate) {
      updateData.deliveryDate = new Date(validatedData.deliveryDate)
    }
    if (validatedData.invoiceableDate) {
      updateData.invoiceableDate = new Date(validatedData.invoiceableDate)
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
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        purchaseOrderId: true,
        purchaseOrder: {
          select: {
            id: true,
            orderNumber: true,
            subject: true,
          },
        },
        plannedStartDate: true,
        plannedEndDate: true,
        actualStartDate: true,
        actualEndDate: true,
        budget: true,
        hourlyRate: true,
        // 実績台帳用の新規フィールド
        projectType: true,
        deliveryDate: true,
        invoiceableDate: true,
        memo: true,
        outsourcingCost: true,
        serverDomainCost: true,
        // 投下工数の集計値
        totalLaborHours: true,
        totalLaborCost: true,
        lastCalculatedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // hourlyRateが変更された場合、集計値を再計算
    if (hourlyRateChanged) {
      try {
        await recalculateProjectLaborCost(id)
      } catch (error) {
        console.warn(`Failed to recalculate labor cost for project ${id}:`, error)
        // 集計値の再計算失敗は警告のみ（案件更新自体は成功とする）
      }
    }

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

    return NextResponse.json({ message: "案件を削除しました" })
  } catch (error) {
    console.warn("Project deletion error:", error)
    return NextResponse.json({ error: "案件の削除に失敗しました" }, { status: 500 })
  }
}