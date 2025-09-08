import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { put, del } from "@vercel/blob"

// POST - 押印画像アップロード
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
    const userId = resolvedParams.id

    // 自分のユーザー情報または管理者のみ更新可能
    if (userId !== session.user.id && !session.user.isAdmin) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "ファイルが選択されていません" }, { status: 400 })
    }

    // ファイルサイズチェック（5MB以下）
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "ファイルサイズは5MB以下にしてください" }, { status: 400 })
    }

    // ファイルタイプチェック
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "PNG、JPEG、WebP形式の画像のみアップロード可能です" }, { status: 400 })
    }

    // 既存の押印画像がある場合は削除
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { sealImagePath: true },
    })

    if (user?.sealImagePath) {
      try {
        await del(user.sealImagePath)
      } catch (error) {
        console.error("Failed to delete old seal image:", error)
      }
    }

    // Vercel Blobに画像をアップロード
    const filename = `users/${userId}/seal-${Date.now()}.${file.type.split("/")[1]}`
    const blob = await put(filename, file, {
      access: "public",
      contentType: file.type,
    })

    // データベースを更新
    await prisma.user.update({
      where: { id: userId },
      data: { sealImagePath: blob.url },
    })

    return NextResponse.json({ 
      message: "押印画像をアップロードしました",
      sealImagePath: blob.url 
    })
  } catch (error) {
    console.error("Seal upload error:", error)
    return NextResponse.json({ error: "押印画像のアップロードに失敗しました" }, { status: 500 })
  }
}

// DELETE - 押印画像削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const resolvedParams = await params
    const userId = resolvedParams.id

    // 自分のユーザー情報または管理者のみ削除可能
    if (userId !== session.user.id && !session.user.isAdmin) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 })
    }

    // 既存の押印画像を取得
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { sealImagePath: true },
    })

    if (user?.sealImagePath) {
      try {
        await del(user.sealImagePath)
      } catch (error) {
        console.error("Failed to delete seal image:", error)
      }
    }

    // データベースを更新
    await prisma.user.update({
      where: { id: userId },
      data: { sealImagePath: null },
    })

    return NextResponse.json({ message: "押印画像を削除しました" })
  } catch (error) {
    console.error("Seal delete error:", error)
    return NextResponse.json({ error: "押印画像の削除に失敗しました" }, { status: 500 })
  }
}