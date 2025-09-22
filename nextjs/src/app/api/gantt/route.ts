import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - ガントチャート用データ取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")
    const assigneeId = searchParams.get("assigneeId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // フィルター条件の構築
    const where: any = {}
    
    if (projectId) {
      where.projectId = projectId
    }
    
    if (assigneeId) {
      where.assigneeId = assigneeId
    }
    
    // 開始日・終了日が設定されている課題のみ取得（ガントチャートに表示可能）
    where.startDate = { not: null }
    where.endDate = { not: null }

    // 完了（closed）ステータスのタスクは除外
    where.status = { not: "closed" }
    
    if (startDate && endDate) {
      where.OR = [
        {
          startDate: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          }
        },
        {
          endDate: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          }
        },
        {
          AND: [
            { startDate: { lte: new Date(startDate) } },
            { endDate: { gte: new Date(endDate) } }
          ]
        }
      ]
    }

    const issues = await prisma.issue.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            projectNumber: true,
            projectName: true,
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
        reporter: {
          select: {
            id: true,
            lastName: true,
            firstName: true,
            employeeNumber: true,
          },
        },
        parentIssue: {
          select: {
            id: true,
            title: true,
          },
        },
        childIssues: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: [
        { startDate: "asc" },
        { createdAt: "asc" },
      ],
    })

    // ガントチャート形式にデータを変換
    const tasks = issues.map(issue => {
      // ステータスに応じたバーの色を設定
      let barColor = "#94a3b8" // デフォルト（gray）
      let barProgressColor = "#64748b"
      
      switch (issue.status) {
        case "open":
          barColor = "#cbd5e1"
          barProgressColor = "#94a3b8"
          break
        case "in_progress":
          barColor = "#93c5fd"
          barProgressColor = "#3b82f6"
          break
        case "resolved":
          barColor = "#86efac"
          barProgressColor = "#22c55e"
          break
        case "closed":
          barColor = "#a78bfa"
          barProgressColor = "#8b5cf6"
          break
      }

      // 優先度に応じた追加のスタイリング
      const isHighPriority = issue.priority === "high" || issue.priority === "critical"
      
      return {
        id: issue.id,
        name: issue.title,
        type: issue.childIssues.length > 0 ? "project" : "task",
        start: issue.startDate,
        end: issue.endDate,
        progress: issue.progress,
        dependencies: issue.dependencies ? JSON.parse(issue.dependencies) : [],
        isDisabled: false,
        hideChildren: false,
        styles: {
          barColor,
          barProgressColor,
          barProgressSelectedColor: barProgressColor,
          barBorderRadius: 4,
          ...(isHighPriority && {
            barBorderColor: "#ef4444",
            barBorderWidth: 2,
          }),
        },
        // カスタムプロパティ（表示用）
        project: issue.project,
        assignee: issue.assignee ? {
          id: issue.assignee.id,
          name: `${issue.assignee.lastName} ${issue.assignee.firstName}`,
          employeeNumber: issue.assignee.employeeNumber,
        } : null,
        reporter: {
          id: issue.reporter.id,
          name: `${issue.reporter.lastName} ${issue.reporter.firstName}`,
          employeeNumber: issue.reporter.employeeNumber,
        },
        status: issue.status,
        priority: issue.priority,
        category: issue.category,
        parentId: issue.parentIssueId,
        hasChildren: issue.childIssues.length > 0,
      }
    })

    // プロジェクト一覧も返す（フィルター用）
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        projectNumber: true,
        projectName: true,
      },
      orderBy: { createdAt: "desc" },
    })

    // 担当者一覧も返す（フィルター用）
    const users = await prisma.user.findMany({
      where: { status: "active" },
      select: {
        id: true,
        lastName: true,
        firstName: true,
        employeeNumber: true,
      },
      orderBy: [
        { lastName: "asc" },
        { firstName: "asc" },
      ],
    })

    const assignees = users.map(user => ({
      id: user.id,
      name: `${user.lastName} ${user.firstName}`,
      employeeNumber: user.employeeNumber,
    }))

    return NextResponse.json({
      tasks,
      projects,
      assignees,
      total: tasks.length,
    })
  } catch (error) {
    console.warn("Gantt data fetch error:", error)
    return NextResponse.json({ error: "ガントチャートデータの取得に失敗しました" }, { status: 500 })
  }
}