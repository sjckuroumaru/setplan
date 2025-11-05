import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { recalculateProjectLaborCost } from "@/lib/project-utils"

// バリデーションスキーマ
const planSchema = z.object({
  id: z.string().optional(), // 既存項目の場合
  projectId: z.string().optional(),
  content: z.string().min(1, "予定内容は必須です").max(500, "予定内容は500文字以内で入力してください"),
  details: z.string().max(2000, "詳細は2000文字以内で入力してください").optional(),
})

const actualSchema = z.object({
  id: z.string().optional(), // 既存項目の場合
  projectId: z.string().optional(),
  content: z.string().min(1, "実績内容は必須です").max(500, "実績内容は500文字以内で入力してください"),
  hours: z.number().min(0, "実績時間は0以上で入力してください").max(24, "実績時間は24時間以内で入力してください"),
  details: z.string().max(2000, "詳細は2000文字以内で入力してください").optional(),
})

const updateScheduleSchema = z.object({
  userId: z.string().optional(), // 管理者のみ変更可能
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  reflection: z.string().max(2000, "所感は2000文字以内で入力してください").optional(),
  plans: z.array(planSchema).optional().default([]),
  actuals: z.array(actualSchema).optional().default([]),
})

async function checkAuthentication() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return null
  }
  
  return session
}

// GET - 個別予定実績取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await checkAuthentication()
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const { id } = await params

    const schedule = await prisma.dailySchedule.findUnique({
      where: { id },
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
      return NextResponse.json({ error: "予定実績が見つかりません" }, { status: 404 })
    }

    // 全ユーザーが閲覧可能（編集・削除は別途制限）

    return NextResponse.json({ schedule })
  } catch (error) {
    console.warn("Schedule fetch error:", error)
    return NextResponse.json({ error: "予定実績情報の取得に失敗しました" }, { status: 500 })
  }
}

// PUT - 予定実績更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await checkAuthentication()
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateScheduleSchema.parse(body)

    // 予定実績の存在確認
    const existingSchedule = await prisma.dailySchedule.findUnique({
      where: { id },
      include: {
        plans: true,
        actuals: true,
      },
    })

    if (!existingSchedule) {
      return NextResponse.json({ error: "予定実績が見つかりません" }, { status: 404 })
    }

    // 管理者以外は自分の予定実績のみ更新可能
    if (!session.user.isAdmin && existingSchedule.userId !== session.user.id) {
      return NextResponse.json({ error: "更新権限がありません" }, { status: 403 })
    }

    // userIdの変更は管理者のみ可能
    if (validatedData.userId && validatedData.userId !== existingSchedule.userId) {
      if (!session.user.isAdmin) {
        return NextResponse.json({ error: "ユーザーを変更する権限がありません" }, { status: 403 })
      }

      // 変更先ユーザーの存在確認
      const targetUser = await prisma.user.findUnique({
        where: { id: validatedData.userId },
      })

      if (!targetUser) {
        return NextResponse.json({ error: "指定されたユーザーが存在しません" }, { status: 400 })
      }
    }

    // トランザクション内で更新
    const result = await prisma.$transaction(async (tx) => {
      // 集計値再計算用: 既存の実績に紐づく案件IDを取得
      const oldProjectIds = existingSchedule.actuals
        .map(actual => actual.projectId)
        .filter((id): id is string => id !== null)

      // 日別基本情報を更新
      const updateData: any = {
        checkInTime: validatedData.checkInTime,
        checkOutTime: validatedData.checkOutTime,
        reflection: validatedData.reflection,
      }

      // 管理者の場合のみuserIdを更新
      if (session.user.isAdmin && validatedData.userId) {
        updateData.userId = validatedData.userId
      }

      await tx.dailySchedule.update({
        where: { id },
        data: updateData,
      })

      // 既存の予定項目を削除
      await tx.schedulePlan.deleteMany({
        where: { scheduleId: id },
      })

      // 新しい予定項目を作成
      if (validatedData.plans.length > 0) {
        await tx.schedulePlan.createMany({
          data: validatedData.plans.map((plan, index) => ({
            scheduleId: id,
            projectId: plan.projectId,
            content: plan.content,
            details: plan.details,
            displayOrder: index,
          })),
        })
      }

      // 既存の実績項目を削除
      await tx.scheduleActual.deleteMany({
        where: { scheduleId: id },
      })

      // 集計値再計算用: 新しい実績に紐づく案件IDを取得
      const newProjectIds = validatedData.actuals
        .map(actual => actual.projectId)
        .filter((id): id is string => id !== undefined)

      // 新しい実績項目を作成
      if (validatedData.actuals.length > 0) {
        await tx.scheduleActual.createMany({
          data: validatedData.actuals.map((actual, index) => ({
            scheduleId: id,
            projectId: actual.projectId,
            content: actual.content,
            hours: actual.hours,
            details: actual.details,
            displayOrder: index,
          })),
        })
      }

      // 集計値再計算: 影響を受ける全ての案件（重複除去）
      const affectedProjectIds = [...new Set([...oldProjectIds, ...newProjectIds])]

      for (const projectId of affectedProjectIds) {
        await recalculateProjectLaborCost(projectId, tx)
      }

      // 更新後のデータを取得
      return await tx.dailySchedule.findUnique({
        where: { id },
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

    return NextResponse.json({ schedule: result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    
    console.warn("Schedule update error:", error)
    return NextResponse.json({ error: "予定実績の更新に失敗しました" }, { status: 500 })
  }
}

// DELETE - 予定実績削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await checkAuthentication()
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const { id } = await params

    const schedule = await prisma.dailySchedule.findUnique({
      where: { id },
    })

    if (!schedule) {
      return NextResponse.json({ error: "予定実績が見つかりません" }, { status: 404 })
    }

    // 管理者以外は自分の予定実績のみ削除可能
    if (!session.user.isAdmin && schedule.userId !== session.user.id) {
      return NextResponse.json({ error: "削除権限がありません" }, { status: 403 })
    }

    // トランザクション内で削除と集計値再計算
    await prisma.$transaction(async (tx) => {
      // 削除前に実績に紐づく案件IDを取得
      const actuals = await tx.scheduleActual.findMany({
        where: { scheduleId: id },
        select: { projectId: true },
      })

      const projectIds = actuals
        .map(actual => actual.projectId)
        .filter((id): id is string => id !== null)

      // カスケード削除により関連する予定・実績項目も自動削除される
      await tx.dailySchedule.delete({
        where: { id },
      })

      // 影響を受ける案件の集計値を再計算
      const uniqueProjectIds = [...new Set(projectIds)]
      for (const projectId of uniqueProjectIds) {
        await recalculateProjectLaborCost(projectId, tx)
      }
    })

    return NextResponse.json({ message: "予定実績を削除しました" })
  } catch (error) {
    console.warn("Schedule deletion error:", error)
    return NextResponse.json({ error: "予定実績の削除に失敗しました" }, { status: 500 })
  }
}