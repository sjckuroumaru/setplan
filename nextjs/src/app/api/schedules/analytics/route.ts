import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function checkAuthentication() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return null
  }
  
  return session
}

// GET - グラフ用分析データ取得
export async function GET(request: NextRequest) {
  try {
    const session = await checkAuthentication()
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const userId = searchParams.get("userId")
    const projectId = searchParams.get("projectId")
    const departmentId = searchParams.get("departmentId")

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "開始日と終了日は必須です" }, { status: 400 })
    }

    // 日本時間対応
    const startDateTime = new Date(startDate + 'T00:00:00.000+09:00')
    const endDateTime = new Date(endDate + 'T23:59:59.999+09:00')
    
    const where: any = {
      scheduleDate: {
        gte: startDateTime,
        lte: endDateTime,
      }
    }

    // ユーザーフィルター
    if (userId && userId !== "all") {
      where.userId = userId
    }

    // 基本データ取得（すべての実績を取得し、後でフィルタリング）
    const schedules = await prisma.dailySchedule.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            lastName: true,
            firstName: true,
            employeeNumber: true,
          },
        },
        actuals: {
          include: {
            project: {
              select: {
                id: true,
                projectNumber: true,
                projectName: true,
                departmentId: true,
                department: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: { displayOrder: "asc" },
        },
      },
      orderBy: { scheduleDate: "asc" },
    })


    // ユーザー別案件別実績時間の集計
    const userProjectHours: any = {}
    const projectTotals: any = {}
    const departmentTotals: any = {}
    const tableData: any[] = []

    schedules.forEach(schedule => {
      const userName = `${schedule.user.lastName} ${schedule.user.firstName}`
      const yearMonth = schedule.scheduleDate.toISOString().slice(0, 7) // YYYY-MM形式
      
      if (!userProjectHours[userName]) {
        userProjectHours[userName] = { name: userName, total: 0 }
      }

      schedule.actuals.forEach(actual => {
        // 案件フィルタリング（クライアント側で適用）
        if (projectId && projectId !== "all") {
          // 指定された案件IDと一致しない場合はスキップ
          if (actual.projectId !== projectId) {
            return
          }
        }

        // 部署フィルタリング
        if (departmentId && departmentId !== "all") {
          // 指定された部署IDと一致しない場合はスキップ
          if (actual.project?.departmentId !== departmentId) {
            return
          }
        }

        const projectName = actual.project?.projectName || "その他"
        
        // ユーザー別案件別集計
        if (!userProjectHours[userName][projectName]) {
          userProjectHours[userName][projectName] = 0
        }
        userProjectHours[userName][projectName] += actual.hours
        userProjectHours[userName].total += actual.hours
        
        // 案件別総計
        if (!projectTotals[projectName]) {
          projectTotals[projectName] = 0
        }
        projectTotals[projectName] += actual.hours

        // 部署別総計
        const departmentName = actual.project?.department?.name || "未割当"
        if (!departmentTotals[departmentName]) {
          departmentTotals[departmentName] = 0
        }
        departmentTotals[departmentName] += actual.hours

        // 表分析用データ
        const existingEntry = tableData.find(entry => 
          entry.yearMonth === yearMonth && 
          entry.userName === userName && 
          entry.projectName === projectName
        )
        
        if (existingEntry) {
          existingEntry.totalHours += actual.hours
        } else {
          tableData.push({
            yearMonth,
            userName,
            projectName,
            totalHours: actual.hours
          })
        }
      })
    })

    // レスポンスデータの整形
    const userProjectData = Object.values(userProjectHours)
    
    // 案件別配分データ
    const totalHours = Object.values(projectTotals).reduce((sum: number, hours: any) => sum + hours, 0)
    const projectDistribution = Object.entries(projectTotals).map(([name, value]: [string, any]) => ({
      name,
      value,
      percentage: Math.round((value / totalHours) * 100)
    }))

    // 部署別配分データ
    const departmentDistribution = Object.entries(departmentTotals).map(([name, value]: [string, any]) => ({
      name,
      value,
      percentage: totalHours > 0 ? Math.round((value / totalHours) * 100) : 0
    }))

    // 表分析データのソート（年月→名前→合計時間の降順）
    const sortedTableData = tableData.sort((a, b) => {
      if (a.yearMonth !== b.yearMonth) {
        return b.yearMonth.localeCompare(a.yearMonth) // 年月降順
      }
      if (a.userName !== b.userName) {
        return a.userName.localeCompare(b.userName) // 名前昇順
      }
      return b.totalHours - a.totalHours // 合計時間降順
    })

    // 統計データ
    const totalActualHours = schedules.reduce((sum, schedule) => 
      sum + schedule.actuals.reduce((actualSum, actual) => actualSum + actual.hours, 0), 0
    )
    
    const uniqueUsers = [...new Set(schedules.map(s => s.userId))]
    const averageHours = uniqueUsers.length > 0 ? totalActualHours / uniqueUsers.length : 0
    
    // 目標時間（1日8時間 × 日数 × ユーザー数で計算）
    const daysDiff = Math.ceil((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60 * 24))
    const targetHours = daysDiff * 8 * uniqueUsers.length
    const achievementRate = targetHours > 0 ? (totalActualHours / targetHours) * 100 : 0

    return NextResponse.json({
      userProjectData,
      projectDistribution,
      departmentDistribution,
      tableData: sortedTableData,
      statistics: {
        totalHours: totalActualHours,
        averageHours: Math.round(averageHours * 10) / 10,
        targetHours,
        achievementRate: Math.round(achievementRate * 10) / 10,
        userCount: uniqueUsers.length
      },
      dateRange: { startDate, endDate }
    })
  } catch (error) {
    console.warn("Analytics data fetch error:", error)
    return NextResponse.json({ error: "分析データの取得に失敗しました" }, { status: 500 })
  }
}