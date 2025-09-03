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

// GET - 日付指定での予定実績取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const session = await checkAuthentication()
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const { date } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId") || session.user.id

    // 管理者以外は自分の予定実績のみ参照可能
    const targetUserId = session.user.isAdmin && userId !== session.user.id ? userId : session.user.id

    const schedule = await prisma.dailySchedule.findUnique({
      where: {
        userId_scheduleDate: {
          userId: targetUserId,
          scheduleDate: new Date(date),
        },
      },
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
    })

    if (!schedule) {
      // 予定実績が存在しない場合は空のデータを返す
      return NextResponse.json({ 
        schedule: null,
        message: "指定日の予定実績は登録されていません" 
      })
    }

    return NextResponse.json({ schedule })
  } catch (error) {
    console.warn("Schedule fetch by date error:", error)
    return NextResponse.json({ error: "予定実績情報の取得に失敗しました" }, { status: 500 })
  }
}