import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// 管理者権限チェック
async function checkAdminPermission() {
  const session = await getServerSession(authOptions)

  if (!session || !session.user.isAdmin) {
    return false
  }

  return true
}

// 案件ごとの集計値を再計算
async function recalculateProjectLaborCost(projectId: string) {
  // 案件に紐づく全実績時間の合計を取得
  const totalHours = await prisma.scheduleActual.aggregate({
    where: { projectId },
    _sum: { hours: true }
  })

  // 案件情報を取得
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { hourlyRate: true, projectNumber: true }
  })

  if (!project) {
    return {
      success: false,
      projectId,
      message: `Project ${projectId} not found`
    }
  }

  // 投下工数を計算
  // 時間単価がNULLの場合は5,000円/時間をデフォルト値として使用
  const hours = totalHours._sum.hours || 0
  const hourlyRate = project.hourlyRate || 5000
  const laborCost = Number(hours) * Number(hourlyRate)

  // Projectテーブルを更新
  await prisma.project.update({
    where: { id: projectId },
    data: {
      totalLaborHours: hours,
      totalLaborCost: laborCost,
      lastCalculatedAt: new Date()
    }
  })

  return {
    success: true,
    projectNumber: project.projectNumber,
    hours,
    hourlyRate,
    laborCost
  }
}

// POST - マイグレーション実行
export async function POST(_request: NextRequest) {
  try {
    // 管理者権限チェック
    const isAdmin = await checkAdminPermission()
    if (!isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 })
    }

    // 全案件を取得
    const projects = await prisma.project.findMany({
      select: { id: true, projectNumber: true }
    })

    if (projects.length === 0) {
      return NextResponse.json({
        message: "処理する案件がありません",
        successCount: 0,
        errorCount: 0,
        results: []
      })
    }

    const results: any[] = []
    let successCount = 0
    let errorCount = 0

    // 各案件の集計値を計算
    for (const project of projects) {
      try {
        const result = await recalculateProjectLaborCost(project.id)
        if (result.success) {
          successCount++
          results.push({
            projectNumber: result.projectNumber,
            hours: result.hours,
            hourlyRate: result.hourlyRate,
            laborCost: result.laborCost,
            status: "success"
          })
        } else {
          errorCount++
          results.push({
            projectId: project.id,
            status: "error",
            message: result.message
          })
        }
      } catch (error) {
        errorCount++
        results.push({
          projectNumber: project.projectNumber,
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error"
        })
      }
    }

    return NextResponse.json({
      message: "マイグレーション完了",
      totalCount: projects.length,
      successCount,
      errorCount,
      results
    })
  } catch (error) {
    console.error("Migration error:", error)
    return NextResponse.json(
      {
        error: "マイグレーションに失敗しました",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
