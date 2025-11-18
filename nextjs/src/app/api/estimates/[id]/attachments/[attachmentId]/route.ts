import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { del } from "@vercel/blob"

// DELETE - ファイル削除
export async function DELETE(
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
            userId: true,
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

    // 削除権限チェック（作成者、アップロードユーザー、または管理者のみ）
    const canDelete =
      session.user.isAdmin ||
      attachment.estimate.userId === session.user.id ||
      attachment.uploadedBy === session.user.id

    if (!canDelete) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 })
    }

    // Vercel Blobからファイルを削除
    try {
      await del(attachment.blobUrl)
    } catch (error) {
      console.error("Failed to delete file from blob:", error)
      // Blob削除失敗でも処理を続行（データベースからは削除）
    }

    // データベースから削除
    await prisma.estimateAttachment.delete({
      where: { id: attachmentId },
    })

    return NextResponse.json({
      success: true,
      message: "ファイルを削除しました",
    })
  } catch (error) {
    console.error("File delete error:", error)
    return NextResponse.json({ error: "ファイルの削除に失敗しました" }, { status: 500 })
  }
}
