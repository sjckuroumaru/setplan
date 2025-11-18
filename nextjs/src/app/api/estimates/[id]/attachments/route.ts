import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { put } from "@vercel/blob"

// POST - ファイルアップロード
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const resolvedParams = await params
    const estimateId = resolvedParams.id

    // 見積書の存在確認
    const estimate = await prisma.estimate.findUnique({
      where: { id: estimateId },
      select: { id: true, userId: true },
    })

    if (!estimate) {
      return NextResponse.json({ error: "見積書が見つかりません" }, { status: 404 })
    }

    // 見積書の編集権限チェック（作成者または管理者のみ）
    if (estimate.userId !== session.user.id && !session.user.isAdmin) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const description = formData.get("description") as string | null

    if (!file) {
      return NextResponse.json({ error: "ファイルが選択されていません" }, { status: 400 })
    }

    // 現在の添付ファイル数をチェック（最大10個）
    const attachmentCount = await prisma.estimateAttachment.count({
      where: { estimateId },
    })

    if (attachmentCount >= 10) {
      return NextResponse.json({ error: "添付ファイルは最大10個までです" }, { status: 400 })
    }

    // ファイルサイズチェック（20MB以下）
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "ファイルサイズは20MB以下にしてください" }, { status: 413 })
    }

    // ファイルタイプチェック
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "text/plain",
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "許可されていないファイル形式です。PDF、Word、Excel、画像、テキストファイルのみアップロード可能です" },
        { status: 400 }
      )
    }

    // Vercel Blobにファイルをアップロード（ランダムサフィックスでURL推測を困難に）
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const blobPath = `estimates/${estimateId}/${sanitizedFileName}`

    // addRandomSuffix: trueでファイル名にランダムな文字列を追加してURL推測を困難にする
    const blob = await put(blobPath, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
    })

    // データベースに保存
    const attachment = await prisma.estimateAttachment.create({
      data: {
        estimateId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        blobPath: blobPath,
        blobUrl: blob.url,
        uploadedBy: session.user.id,
        description: description || null,
      },
      include: {
        uploader: {
          select: {
            id: true,
            lastName: true,
            firstName: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: attachment.id,
        estimateId: attachment.estimateId,
        fileName: attachment.fileName,
        fileSize: attachment.fileSize,
        mimeType: attachment.mimeType,
        blobUrl: attachment.blobUrl,
        uploadedBy: attachment.uploadedBy,
        uploadedByName: `${attachment.uploader.lastName} ${attachment.uploader.firstName}`,
        description: attachment.description,
        createdAt: attachment.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("File upload error:", error)
    return NextResponse.json({ error: "ファイルのアップロードに失敗しました" }, { status: 500 })
  }
}

// GET - ファイル一覧取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const resolvedParams = await params
    const estimateId = resolvedParams.id

    // 見積書の存在確認
    const estimate = await prisma.estimate.findUnique({
      where: { id: estimateId },
      select: { id: true },
    })

    if (!estimate) {
      return NextResponse.json({ error: "見積書が見つかりません" }, { status: 404 })
    }

    // 添付ファイル一覧を取得
    const attachments = await prisma.estimateAttachment.findMany({
      where: { estimateId },
      include: {
        uploader: {
          select: {
            id: true,
            lastName: true,
            firstName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      success: true,
      data: attachments.map((attachment) => ({
        id: attachment.id,
        fileName: attachment.fileName,
        fileSize: attachment.fileSize,
        mimeType: attachment.mimeType,
        uploadedBy: attachment.uploadedBy,
        uploadedByName: `${attachment.uploader.lastName} ${attachment.uploader.firstName}`,
        description: attachment.description,
        createdAt: attachment.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error("Attachments fetch error:", error)
    return NextResponse.json({ error: "ファイル一覧の取得に失敗しました" }, { status: 500 })
  }
}
