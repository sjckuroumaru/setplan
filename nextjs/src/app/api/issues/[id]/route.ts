import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

async function checkAuthentication() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return null
  }
  
  return session
}

// バリデーションスキーマ
const updateIssueSchema = z.object({
  title: z.string().min(1, "タイトルは必須です").max(255, "タイトルは255文字以内で入力してください").optional(),
  description: z.string().min(1, "説明は必須です").max(10000, "説明は10000文字以内で入力してください").optional(),
  projectId: z.string().optional(),
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  category: z.string().max(100, "カテゴリは100文字以内で入力してください").optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().datetime().optional(),
  // ガントチャート用フィールド
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  progress: z.number().min(0).max(100).optional(),
  parentIssueId: z.string().optional(),
  dependencies: z.string().max(1000, "依存関係は1000文字以内で入力してください").optional(), // JSON文字列
})

// GET - 個別課題取得
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

    const issue = await prisma.issue.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            projectNumber: true,
            projectName: true,
          },
        },
        reporter: {
          select: {
            id: true,
            lastName: true,
            firstName: true,
            employeeNumber: true,
          },
        },
        assignee: {
          select: {
            id: true,
            lastName: true,
            firstName: true,
            employeeNumber: true,
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                lastName: true,
                firstName: true,
                employeeNumber: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!issue) {
      return NextResponse.json({ error: "課題が見つかりません" }, { status: 404 })
    }

    // データの整形
    const formattedIssue = {
      id: issue.id,
      title: issue.title,
      description: issue.description,
      status: issue.status,
      priority: issue.priority,
      category: issue.category,
      project: issue.project,
      reporter: issue.reporter ? {
        id: issue.reporter.id,
        lastName: issue.reporter.lastName,
        firstName: issue.reporter.firstName,
        name: `${issue.reporter.lastName} ${issue.reporter.firstName}`,
        employeeNumber: issue.reporter.employeeNumber,
      } : null,
      assignee: issue.assignee ? {
        id: issue.assignee.id,
        lastName: issue.assignee.lastName,
        firstName: issue.assignee.firstName,
        name: `${issue.assignee.lastName} ${issue.assignee.firstName}`,
        employeeNumber: issue.assignee.employeeNumber,
      } : null,
      dueDate: issue.dueDate,
      startDate: issue.startDate,
      endDate: issue.endDate,
      progress: issue.progress,
      parentIssueId: issue.parentIssueId,
      dependencies: issue.dependencies,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      resolvedAt: issue.resolvedAt,
      comments: issue.comments.map(comment => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        user: {
          id: comment.user.id,
          name: `${comment.user.lastName} ${comment.user.firstName}`,
          employeeNumber: comment.user.employeeNumber,
        },
      })),
    }

    return NextResponse.json({ issue: formattedIssue })
  } catch (error) {
    console.warn("Issue fetch error:", error)
    return NextResponse.json({ error: "課題情報の取得に失敗しました" }, { status: 500 })
  }
}

// PUT - 課題更新
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
    const validatedData = updateIssueSchema.parse(body)

    // 課題の存在確認
    const existingIssue = await prisma.issue.findUnique({
      where: { id },
      include: { reporter: true },
    })

    if (!existingIssue) {
      return NextResponse.json({ error: "課題が見つかりません" }, { status: 404 })
    }

    // 更新権限チェック（すべての認証済みユーザーが課題を編集可能）
    // 管理者や一般ユーザーが担当者を変更できるようにするため、権限チェックを緩和

    // 案件の存在確認（指定されている場合）
    if (validatedData.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: validatedData.projectId },
      })

      if (!project) {
        return NextResponse.json({ error: "指定された案件が見つかりません" }, { status: 404 })
      }
    }

    // 担当者の存在確認（指定されている場合）
    if (validatedData.assigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: validatedData.assigneeId },
      })

      if (!assignee) {
        return NextResponse.json({ error: "指定された担当者が見つかりません" }, { status: 404 })
      }
    }

    // 更新データの準備
    const updateData: any = {}

    if (validatedData.title !== undefined) updateData.title = validatedData.title
    if (validatedData.description !== undefined) updateData.description = validatedData.description
    if (validatedData.projectId !== undefined) updateData.projectId = validatedData.projectId
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status
      // ステータスが解決済みになった場合、解決日時を設定
      if (validatedData.status === "resolved" && existingIssue.status !== "resolved") {
        updateData.resolvedAt = new Date()
      }
      // ステータスが解決済みから他に変更された場合、解決日時をクリア
      if (validatedData.status !== "resolved" && existingIssue.status === "resolved") {
        updateData.resolvedAt = null
      }
    }
    if (validatedData.priority !== undefined) updateData.priority = validatedData.priority
    if (validatedData.category !== undefined) updateData.category = validatedData.category
    if (validatedData.assigneeId !== undefined) {
      // 未割当への変更の場合はnullを設定
      updateData.assigneeId = validatedData.assigneeId || null
    }
    if (validatedData.dueDate !== undefined) {
      updateData.dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null
    }
    // ガントチャート用フィールド
    if (validatedData.startDate !== undefined) {
      updateData.startDate = validatedData.startDate ? new Date(validatedData.startDate) : null
    }
    if (validatedData.endDate !== undefined) {
      updateData.endDate = validatedData.endDate ? new Date(validatedData.endDate) : null
    }
    if (validatedData.progress !== undefined) updateData.progress = validatedData.progress
    if (validatedData.parentIssueId !== undefined) updateData.parentIssueId = validatedData.parentIssueId
    if (validatedData.dependencies !== undefined) updateData.dependencies = validatedData.dependencies

    // 課題更新
    const updatedIssue = await prisma.issue.update({
      where: { id },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            projectNumber: true,
            projectName: true,
          },
        },
        reporter: {
          select: {
            id: true,
            lastName: true,
            firstName: true,
            employeeNumber: true,
          },
        },
        assignee: {
          select: {
            id: true,
            lastName: true,
            firstName: true,
            employeeNumber: true,
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                lastName: true,
                firstName: true,
                employeeNumber: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    })


    return NextResponse.json({
      issue: {
        ...updatedIssue,
        reporter: updatedIssue.reporter ? {
          id: updatedIssue.reporter.id,
          lastName: updatedIssue.reporter.lastName,
          firstName: updatedIssue.reporter.firstName,
          name: `${updatedIssue.reporter.lastName} ${updatedIssue.reporter.firstName}`,
          employeeNumber: updatedIssue.reporter.employeeNumber,
        } : null,
        assignee: updatedIssue.assignee ? {
          id: updatedIssue.assignee.id,
          lastName: updatedIssue.assignee.lastName,
          firstName: updatedIssue.assignee.firstName,
          name: `${updatedIssue.assignee.lastName} ${updatedIssue.assignee.firstName}`,
          employeeNumber: updatedIssue.assignee.employeeNumber,
        } : null,
        comments: updatedIssue.comments.map(comment => ({
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          user: {
            id: comment.user.id,
            name: `${comment.user.lastName} ${comment.user.firstName}`,
            employeeNumber: comment.user.employeeNumber,
          },
        })),
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    
    console.warn("Issue update error:", error)
    return NextResponse.json({ error: "課題の更新に失敗しました" }, { status: 500 })
  }
}

// DELETE - 課題削除
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

    // 課題の存在確認
    const issue = await prisma.issue.findUnique({
      where: { id },
    })

    if (!issue) {
      return NextResponse.json({ error: "課題が見つかりません" }, { status: 404 })
    }

    // 削除権限チェック（管理者または報告者のみ）
    const canDelete = session.user.isAdmin || issue.reporterId === session.user.id

    if (!canDelete) {
      return NextResponse.json({ error: "削除権限がありません" }, { status: 403 })
    }

    // 関連するコメントは自動削除される（Cascade設定済み）
    await prisma.issue.delete({
      where: { id },
    })

    return NextResponse.json({ message: "課題を削除しました" })
  } catch (error) {
    console.warn("Issue deletion error:", error)
    return NextResponse.json({ error: "課題の削除に失敗しました" }, { status: 500 })
  }
}