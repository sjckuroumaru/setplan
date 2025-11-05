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
const createCommentSchema = z.object({
  content: z.string().min(1, "コメント内容は必須です").max(5000, "コメントは5000文字以内で入力してください"),
})

// GET - コメント一覧取得
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

    // 課題の存在確認
    const issue = await prisma.issue.findUnique({
      where: { id },
    })

    if (!issue) {
      return NextResponse.json({ error: "課題が見つかりません" }, { status: 404 })
    }

    // コメント一覧取得
    const comments = await prisma.comment.findMany({
      where: { issueId: id },
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
    })

    // データの整形
    const formattedComments = comments.map(comment => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      user: {
        id: comment.user.id,
        name: `${comment.user.lastName} ${comment.user.firstName}`,
        employeeNumber: comment.user.employeeNumber,
      },
    }))

    return NextResponse.json({ comments: formattedComments })
  } catch (error) {
    console.warn("Comments fetch error:", error)
    return NextResponse.json({ error: "コメントの取得に失敗しました" }, { status: 500 })
  }
}

// POST - コメント作成
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await checkAuthentication()
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    // セッションのユーザーが存在するか確認
    const sessionUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!sessionUser || sessionUser.status !== "active") {
      return NextResponse.json({ error: "ユーザーが見つからないか、無効になっています" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = createCommentSchema.parse(body)

    // 課題の存在確認
    const issue = await prisma.issue.findUnique({
      where: { id },
    })

    if (!issue) {
      return NextResponse.json({ error: "課題が見つかりません" }, { status: 404 })
    }

    // コメント作成
    const comment = await prisma.comment.create({
      data: {
        issueId: id,
        userId: session.user.id,
        content: validatedData.content,
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
      },
    })


    // データの整形
    const formattedComment = {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      user: {
        id: comment.user.id,
        name: `${comment.user.lastName} ${comment.user.firstName}`,
        employeeNumber: comment.user.employeeNumber,
      },
    }

    return NextResponse.json({ comment: formattedComment })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    
    console.warn("Comment creation error:", error)
    return NextResponse.json({ error: "コメントの作成に失敗しました" }, { status: 500 })
  }
}