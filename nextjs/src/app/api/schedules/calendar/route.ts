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

// GET - カレンダー用予定実績データ取得
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

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "開始日と終了日は必須です" }, { status: 400 })
    }

    // フィルター条件（日本時間対応）
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
        plans: {
          include: {
            project: {
              select: {
                id: true,
                projectNumber: true,
                projectName: true,
              },
            },
          },
          orderBy: { displayOrder: "asc" },
        },
        actuals: {
          include: {
            project: {
              select: {
                id: true,
                projectNumber: true,
                projectName: true,
              },
            },
          },
          orderBy: { displayOrder: "asc" },
        },
      },
      orderBy: { scheduleDate: "asc" },
    })

    // カレンダー表示用にデータを変換
    const calendarData = schedules.map(schedule => ({
      id: schedule.id,
      date: schedule.scheduleDate.toISOString().split('T')[0],
      checkInTime: schedule.checkInTime,
      checkOutTime: schedule.checkOutTime,
      reflection: schedule.reflection,
      user: {
        id: schedule.user.id,
        name: `${schedule.user.lastName} ${schedule.user.firstName}`,
        employeeNumber: schedule.user.employeeNumber,
      },
      plans: schedule.plans.map(plan => ({
        id: plan.id,
        content: plan.content,
        details: plan.details,
        project: plan.project ? {
          id: plan.project.id,
          name: plan.project.projectName,
          number: plan.project.projectNumber,
        } : null,
      })),
      actuals: schedule.actuals.map(actual => ({
        id: actual.id,
        content: actual.content,
        hours: actual.hours,
        details: actual.details,
        project: actual.project ? {
          id: actual.project.id,
          name: actual.project.projectName,
          number: actual.project.projectNumber,
        } : null,
      })),
      totalHours: schedule.actuals.reduce((sum, actual) => sum + actual.hours, 0),
    }))

    return NextResponse.json({ 
      schedules: calendarData,
      dateRange: { startDate, endDate },
      totalCount: calendarData.length
    })
  } catch (error) {
    console.warn("Calendar data fetch error:", error)
    return NextResponse.json({ error: "カレンダーデータの取得に失敗しました" }, { status: 500 })
  }
}