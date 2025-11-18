import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - ファイルダウンロード（認証必須）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const resolvedParams = await params
    const estimateId = resolvedParams.id
    const attachmentId = resolvedParams.attachmentId

    // 添付ファイルの取得
    const attachment = await prisma.estimateAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        estimate: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!attachment) {
      return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 404 })
    }

    // 見積書IDの一致確認
    if (attachment.estimateId !== estimateId) {
      return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 })
    }

    // Vercel Blobからファイルを取得してプロキシ
    // これにより、ログインユーザーのみがアクセス可能になる
    const blobResponse = await fetch(attachment.blobUrl)

    if (!blobResponse.ok) {
      throw new Error("Failed to fetch blob")
    }

    // ファイルをストリーミングでクライアントに返す
    const headers = new Headers()
    headers.set("Content-Type", attachment.mimeType)
    headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(attachment.fileName)}"`)

    return new NextResponse(blobResponse.body, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error("File download error:", error)
    return NextResponse.json({ error: "ファイルのダウンロードに失敗しました" }, { status: 500 })
  }
}
