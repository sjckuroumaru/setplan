import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { differenceInDays, isWeekend } from "date-fns"

// 営業日数を計算
function getBusinessDaysCount(startDate: Date, endDate: Date): number {
  let count = 0
  const current = new Date(startDate)

  while (current <= endDate) {
    if (!isWeekend(current)) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }

  return count
}

// 計画時間の計算（営業日数 × 8時間）
function calculatePlannedHours(startDate: Date, endDate: Date): number {
  const businessDays = getBusinessDaysCount(startDate, endDate)
  return businessDays * 8 // 1日8時間として計算
}

// GET - EVM分析データ取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const { projectId } = await params

    // プロジェクト情報を取得
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        projectName: true,
        budget: true,
        hourlyRate: true,
        plannedStartDate: true,
        plannedEndDate: true,
        actualStartDate: true,
        actualEndDate: true,
        status: true,
      },
    })

    if (!project) {
      return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 })
    }

    // 予算と時間単価が設定されていない場合はエラー
    if (!project.budget || !project.hourlyRate) {
      return NextResponse.json({
        error: "EVM分析を実行するには予算と時間単価の設定が必要です"
      }, { status: 400 })
    }

    // 開始日と終了日が設定されていない場合はエラー
    if (!project.plannedStartDate || !project.plannedEndDate) {
      return NextResponse.json({
        error: "EVM分析を実行するには開始予定日と終了予定日の設定が必要です"
      }, { status: 400 })
    }

    // 実績時間を集計
    const scheduleActuals = await prisma.scheduleActual.findMany({
      where: { projectId },
      select: {
        hours: true,
        schedule: {
          select: {
            scheduleDate: true,
            userId: true,
            user: {
              select: {
                id: true,
                lastName: true,
                firstName: true,
              }
            }
          }
        }
      }
    })

    // ユーザー別の実績時間を集計
    const userHoursMap = new Map<string, { userName: string; totalHours: number }>()
    let totalActualHours = 0

    scheduleActuals.forEach(actual => {
      const userId = actual.schedule.userId
      const userName = `${actual.schedule.user.lastName} ${actual.schedule.user.firstName}`

      totalActualHours += actual.hours

      if (userHoursMap.has(userId)) {
        const existing = userHoursMap.get(userId)!
        existing.totalHours += actual.hours
      } else {
        userHoursMap.set(userId, {
          userName,
          totalHours: actual.hours
        })
      }
    })

    // 日別の実績を集計（時系列データ用）
    const dailyActualsMap = new Map<string, number>()
    scheduleActuals.forEach(actual => {
      const dateKey = actual.schedule.scheduleDate.toISOString().split('T')[0]
      const existing = dailyActualsMap.get(dateKey) || 0
      dailyActualsMap.set(dateKey, existing + actual.hours)
    })

    const currentDate = new Date()
    const plannedStartDate = new Date(project.plannedStartDate)
    const plannedEndDate = new Date(project.plannedEndDate)

    // 計画時間を計算
    const plannedHours = calculatePlannedHours(plannedStartDate, plannedEndDate)

    // 各種メトリクスを計算
    const budget = parseFloat(project.budget.toString())
    const hourlyRate = parseFloat(project.hourlyRate.toString())

    // PV（計画価値）の計算
    const totalDays = differenceInDays(plannedEndDate, plannedStartDate) + 1
    const elapsedDays = Math.min(
      Math.max(differenceInDays(currentDate, plannedStartDate) + 1, 0),
      totalDays
    )
    const plannedProgress = elapsedDays / totalDays
    const pv = budget * plannedProgress

    // AC（実コスト）の計算
    const ac = totalActualHours * hourlyRate

    // EV（出来高価値）の計算（実績時間ベース）
    const actualProgress = Math.min(totalActualHours / plannedHours, 1)
    const ev = budget * actualProgress

    // 各種差異と指数の計算
    const sv = ev - pv // スケジュール差異
    const cv = ev - ac // コスト差異
    const spi = pv > 0 ? ev / pv : 0 // スケジュール効率指数
    const cpi = ac > 0 ? ev / ac : 0 // コスト効率指数

    // 完成時予測
    const etc = cpi > 0 ? (budget - ev) / cpi : budget - ev // 残作業予測コスト
    const eac = ac + etc // 完成時総コスト予測

    // 時系列データの作成
    const timeSeries: Array<{ date: string; pv: number; ev: number; ac: number }> = []
    const current = new Date(plannedStartDate)
    let cumulativePV = 0
    let cumulativeAC = 0
    let cumulativeEV = 0

    while (current <= currentDate && current <= plannedEndDate) {
      const dateStr = current.toISOString().split('T')[0]
      const dayProgress = (differenceInDays(current, plannedStartDate) + 1) / totalDays
      cumulativePV = budget * dayProgress

      // その日の実績時間を取得
      const dailyHours = dailyActualsMap.get(dateStr) || 0
      cumulativeAC += dailyHours * hourlyRate

      // EVは実績時間の累積から計算
      const totalHoursUntilDate = Array.from(dailyActualsMap.entries())
        .filter(([date]) => date <= dateStr)
        .reduce((sum, [, hours]) => sum + hours, 0)

      const progressUntilDate = Math.min(totalHoursUntilDate / plannedHours, 1)
      cumulativeEV = budget * progressUntilDate

      timeSeries.push({
        date: dateStr,
        pv: Math.round(cumulativePV),
        ev: Math.round(cumulativeEV),
        ac: Math.round(cumulativeAC),
      })

      current.setDate(current.getDate() + 1)
    }

    // ユーザー別実績データの作成
    const actualHours = Array.from(userHoursMap.entries()).map(([userId, data]) => ({
      userId,
      userName: data.userName,
      totalHours: data.totalHours,
      cost: Math.round(data.totalHours * hourlyRate),
    }))

    // レスポンス
    return NextResponse.json({
      project: {
        id: project.id,
        projectName: project.projectName,
        budget: Math.round(budget),
        plannedStartDate: project.plannedStartDate,
        plannedEndDate: project.plannedEndDate,
        actualStartDate: project.actualStartDate,
        actualEndDate: project.actualEndDate,
        status: project.status,
        plannedHours,
      },
      metrics: {
        pv: Math.round(pv),
        ev: Math.round(ev),
        ac: Math.round(ac),
        sv: Math.round(sv),
        cv: Math.round(cv),
        spi: Math.round(spi * 100) / 100,
        cpi: Math.round(cpi * 100) / 100,
        etc: Math.round(etc),
        eac: Math.round(eac),
      },
      timeSeries,
      actualHours,
    })
  } catch (error) {
    console.warn("EVM analysis error:", error)
    return NextResponse.json({ error: "EVM分析データの取得に失敗しました" }, { status: 500 })
  }
}