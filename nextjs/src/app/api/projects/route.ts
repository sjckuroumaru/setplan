import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// バリデーションスキーマ
const createProjectSchema = z.object({
  projectNumber: z.string().min(1, "案件番号は必須です").max(50, "案件番号は50文字以内で入力してください"),
  projectName: z.string().min(1, "案件名は必須です").max(255, "案件名は255文字以内で入力してください"),
  description: z.string().max(10000, "説明は10000文字以内で入力してください").optional(),
  status: z.enum(["planning", "developing", "active", "suspended", "completed"]).default("planning"),
  plannedStartDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
  actualStartDate: z.string().optional(),
  actualEndDate: z.string().optional(),
  budget: z.number().optional(),
  hourlyRate: z.number().optional(),
})

// 管理者権限チェック
async function checkAdminPermission() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user.isAdmin) {
    return false
  }
  
  return true
}

// GET - 案件一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limitParam = searchParams.get("limit")
    const limit = limitParam ? parseInt(limitParam) : undefined
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const activeOnly = searchParams.get("activeOnly") === "true"

    const skip = limit ? (page - 1) * limit : undefined

    // フィルター条件
    const where: any = {}
    
    if (search) {
      where.OR = [
        { projectNumber: { contains: search, mode: "insensitive" } },
        { projectName: { contains: search, mode: "insensitive" } },
      ]
    }
    
    if (status && status !== "all") {
      where.status = status
    }
    
    // activeOnlyが指定された場合、計画中・開発中・稼働中のみ取得
    if (activeOnly) {
      where.status = {
        in: ["planning", "developing", "active"]
      }
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        select: {
          id: true,
          projectNumber: true,
          projectName: true,
          description: true,
          status: true,
          plannedStartDate: true,
          plannedEndDate: true,
          actualStartDate: true,
          actualEndDate: true,
          budget: true,
          hourlyRate: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.project.count({ where }),
    ])

    // limitが指定されていない場合はページネーション情報を省略
    if (!limit) {
      return NextResponse.json({
        projects,
      })
    }

    return NextResponse.json({
      projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.warn("Project list error:", error)
    return NextResponse.json({ error: "案件一覧の取得に失敗しました" }, { status: 500 })
  }
}

// POST - 新規案件作成
export async function POST(request: NextRequest) {
  try {
    const isAdmin = await checkAdminPermission()
    if (!isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createProjectSchema.parse(body)

    // 重複チェック
    const existingProject = await prisma.project.findUnique({
      where: { projectNumber: validatedData.projectNumber },
    })

    if (existingProject) {
      return NextResponse.json({ error: "案件番号が既に存在します" }, { status: 400 })
    }

    // 日付フィールドの変換
    const projectData: any = {
      projectNumber: validatedData.projectNumber,
      projectName: validatedData.projectName,
      description: validatedData.description,
      status: validatedData.status,
    }

    // 予算フィールドの設定
    if (validatedData.budget !== undefined) {
      projectData.budget = validatedData.budget
    }
    if (validatedData.hourlyRate !== undefined) {
      projectData.hourlyRate = validatedData.hourlyRate
    }

    if (validatedData.plannedStartDate) {
      projectData.plannedStartDate = new Date(validatedData.plannedStartDate)
    }
    if (validatedData.plannedEndDate) {
      projectData.plannedEndDate = new Date(validatedData.plannedEndDate)
    }
    if (validatedData.actualStartDate) {
      projectData.actualStartDate = new Date(validatedData.actualStartDate)
    }
    if (validatedData.actualEndDate) {
      projectData.actualEndDate = new Date(validatedData.actualEndDate)
    }

    const project = await prisma.project.create({
      data: projectData,
      select: {
        id: true,
        projectNumber: true,
        projectName: true,
        description: true,
        status: true,
        plannedStartDate: true,
        plannedEndDate: true,
        actualStartDate: true,
        actualEndDate: true,
        budget: true,
        hourlyRate: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    
    console.warn("Project creation error:", error)
    return NextResponse.json({ error: "案件の作成に失敗しました" }, { status: 500 })
  }
}