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
const createIssueSchema = z.object({
  title: z.string().min(1, "タイトルは必須です").max(255, "タイトルは255文字以内で入力してください"),
  description: z.string().min(1, "説明は必須です").max(10000, "説明は10000文字以内で入力してください"),
  projectId: z.string().min(1, "案件は必須です"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  status: z.enum(["open", "in_progress", "resolved", "closed"]).default("open"),
  category: z.string().max(100, "カテゴリは100文字以内で入力してください").optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  // ガントチャート用フィールド
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  progress: z.number().min(0).max(100).default(0),
  parentIssueId: z.string().optional(),
  dependencies: z.string().max(1000, "依存関係は1000文字以内で入力してください").optional(), // JSON文字列
})

// GET - 課題一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await checkAuthentication()
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const status = searchParams.get("status")
    const priority = searchParams.get("priority")
    const projectId = searchParams.get("projectId")
    const assigneeId = searchParams.get("assigneeId")
    const search = searchParams.get("search")

    const offset = (page - 1) * limit

    // フィルター条件の構築
    const where: any = {}

    if (status && status !== "all") {
      where.status = status
    }

    if (priority && priority !== "all") {
      where.priority = priority
    }

    if (projectId && projectId !== "all") {
      where.projectId = projectId
    }

    if (assigneeId && assigneeId !== "all") {
      where.assigneeId = assigneeId
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { id: { contains: search, mode: "insensitive" } },
      ]
    }

    // 課題一覧取得
    const [issues, total] = await Promise.all([
      prisma.issue.findMany({
        where,
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
            select: {
              id: true,
            },
          },
        },
        orderBy: [
          { priority: "desc" },
          { createdAt: "desc" },
        ],
        skip: offset,
        take: limit,
      }),
      prisma.issue.count({ where }),
    ])

    // 統計データの取得
    const stats = await prisma.issue.groupBy({
      by: ["status", "priority"],
      _count: true,
      where: {
        // 統計は全体データから取得（フィルター無し）
      },
    })

    // 統計データの整形
    const statsFormatted = {
      total: await prisma.issue.count(),
      open: stats.filter(s => s.status === "open").reduce((sum, s) => sum + s._count, 0),
      inProgress: stats.filter(s => s.status === "in_progress").reduce((sum, s) => sum + s._count, 0),
      resolved: stats.filter(s => s.status === "resolved").reduce((sum, s) => sum + s._count, 0),
      closed: stats.filter(s => s.status === "closed").reduce((sum, s) => sum + s._count, 0),
      highPriority: stats.filter(s => s.priority === "high" && s.status !== "closed").reduce((sum, s) => sum + s._count, 0),
    }

    // データの整形
    const formattedIssues = issues.map(issue => ({
      id: issue.id,
      title: issue.title,
      description: issue.description,
      status: issue.status,
      priority: issue.priority,
      category: issue.category,
      project: issue.project,
      reporter: issue.reporter ? {
        id: issue.reporter.id,
        name: `${issue.reporter.lastName} ${issue.reporter.firstName}`,
        employeeNumber: issue.reporter.employeeNumber,
      } : null,
      assignee: issue.assignee ? {
        id: issue.assignee.id,
        name: `${issue.assignee.lastName} ${issue.assignee.firstName}`,
        employeeNumber: issue.assignee.employeeNumber,
      } : null,
      dueDate: issue.dueDate,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      resolvedAt: issue.resolvedAt,
      commentsCount: issue.comments.length,
    }))

    return NextResponse.json({
      issues: formattedIssues,
      stats: statsFormatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.warn("Issues fetch error:", error)
    return NextResponse.json({ error: "課題一覧の取得に失敗しました" }, { status: 500 })
  }
}

// POST - 新規課題作成
export async function POST(request: NextRequest) {
  try {
    const session = await checkAuthentication()
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createIssueSchema.parse(body)

    // プロジェクトの存在確認
    const project = await prisma.project.findUnique({
      where: { id: validatedData.projectId },
    })

    if (!project) {
      return NextResponse.json({ error: "指定されたプロジェクトが見つかりません" }, { status: 404 })
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

    // 課題作成
    const issue = await prisma.issue.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        projectId: validatedData.projectId,
        priority: validatedData.priority,
        status: validatedData.status,
        category: validatedData.category,
        reporterId: session.user.id,
        assigneeId: validatedData.assigneeId,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        // ガントチャート用フィールド
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        progress: validatedData.progress || 0,
        parentIssueId: validatedData.parentIssueId,
        dependencies: validatedData.dependencies,
      },
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
      },
    })

    console.log(`New issue created: ${issue.title} by ${session.user.name}`)

    return NextResponse.json({ 
      issue: {
        ...issue,
        reporter: issue.reporter ? {
          id: issue.reporter.id,
          name: `${issue.reporter.lastName} ${issue.reporter.firstName}`,
          employeeNumber: issue.reporter.employeeNumber,
        } : null,
        assignee: issue.assignee ? {
          id: issue.assignee.id,
          name: `${issue.assignee.lastName} ${issue.assignee.firstName}`,
          employeeNumber: issue.assignee.employeeNumber,
        } : null,
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    
    console.warn("Issue creation error:", error)
    return NextResponse.json({ error: "課題の作成に失敗しました" }, { status: 500 })
  }
}