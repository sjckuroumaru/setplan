import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { config } from "@/lib/config"
import { z } from "zod"

// バリデーションスキーマ
const planSchema = z.object({
  projectId: z.string().optional(),
  content: z.string().min(1, "予定内容は必須です").max(500, "予定内容は500文字以内で入力してください"),
  details: z.string().max(2000, "詳細は2000文字以内で入力してください").optional(),
})

const actualSchema = z.object({
  projectId: z.string().optional(),
  content: z.string().min(1, "実績内容は必須です").max(500, "実績内容は500文字以内で入力してください"),
  hours: z.number().min(0, "実績時間は0以上で入力してください").max(24, "実績時間は24時間以内で入力してください"),
  details: z.string().max(2000, "詳細は2000文字以内で入力してください").optional(),
})

const createScheduleSchema = z.object({
  scheduleDate: z.string().min(1, "日付は必須です"),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  reflection: z.string().max(2000, "所感は2000文字以内で入力してください").optional(),
  plans: z.array(planSchema).optional().default([]),
  actuals: z.array(actualSchema).optional().default([]),
})

// 認証チェック
async function checkAuthentication() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return null
  }
  
  return session
}

// GET - 予定実績一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await checkAuthentication()
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || config.pagination.defaultLimit.toString())
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const userId = searchParams.get("userId")
    const search = searchParams.get("search")

    const skip = (page - 1) * limit

    // フィルター条件
    const where: any = {}
    
    // ユーザーフィルター
    if (userId) {
      where.userId = userId
    }

    // 日付範囲フィルター
    if (startDate && endDate) {
      where.scheduleDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    } else if (startDate) {
      where.scheduleDate = {
        gte: new Date(startDate),
      }
    } else if (endDate) {
      where.scheduleDate = {
        lte: new Date(endDate),
      }
    }

    // 検索条件（予定内容と実績内容で検索）
    if (search) {
      where.OR = [
        {
          plans: {
            some: {
              content: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          actuals: {
            some: {
              content: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
      ]
    }

    const [schedules, total] = await Promise.all([
      prisma.dailySchedule.findMany({
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
        orderBy: { scheduleDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.dailySchedule.count({ where }),
    ])

    return NextResponse.json({
      schedules,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.warn("Schedule list error:", error)
    return NextResponse.json({ error: "予定実績一覧の取得に失敗しました" }, { status: 500 })
  }
}

// POST - 新規予定実績作成
export async function POST(request: NextRequest) {
  try {
    const session = await checkAuthentication()
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createScheduleSchema.parse(body)

    // 同日の予定実績が既に存在するかチェック
    const existingSchedule = await prisma.dailySchedule.findUnique({
      where: {
        userId_scheduleDate: {
          userId: session.user.id,
          scheduleDate: new Date(validatedData.scheduleDate),
        },
      },
    })

    if (existingSchedule) {
      return NextResponse.json({ error: "指定日の予定実績は既に存在します" }, { status: 400 })
    }

    // トランザクション内で予定実績を作成
    const result = await prisma.$transaction(async (tx) => {
      // 日別基本情報を作成
      const schedule = await tx.dailySchedule.create({
        data: {
          userId: session.user.id,
          scheduleDate: new Date(validatedData.scheduleDate),
          checkInTime: validatedData.checkInTime,
          checkOutTime: validatedData.checkOutTime,
          reflection: validatedData.reflection,
        },
      })

      // 予定項目を作成
      if (validatedData.plans.length > 0) {
        await tx.schedulePlan.createMany({
          data: validatedData.plans.map((plan, index) => ({
            scheduleId: schedule.id,
            projectId: plan.projectId,
            content: plan.content,
            details: plan.details,
            displayOrder: index,
          })),
        })
      }

      // 実績項目を作成
      if (validatedData.actuals.length > 0) {
        await tx.scheduleActual.createMany({
          data: validatedData.actuals.map((actual, index) => ({
            scheduleId: schedule.id,
            projectId: actual.projectId,
            content: actual.content,
            hours: actual.hours,
            details: actual.details,
            displayOrder: index,
          })),
        })
      }

      // 完全な予定実績データを取得
      return await tx.dailySchedule.findUnique({
        where: { id: schedule.id },
        include: {
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
    })

    return NextResponse.json({ schedule: result }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    
    console.warn("Schedule creation error:", error)
    return NextResponse.json({ error: "予定実績の作成に失敗しました" }, { status: 500 })
  }
}