import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { put, del } from "@vercel/blob"

// POST - 会社印アップロード
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    // 管理者権限チェック
    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "ファイルが必要です" }, { status: 400 })
    }

    // ファイルサイズチェック（5MB以下）
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "ファイルサイズは5MB以下にしてください" }, { status: 400 })
    }

    // ファイル形式チェック
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "PNG、JPG、JPEG形式のみアップロード可能です" }, { status: 400 })
    }

    // 既存の自社情報を取得
    const company = await prisma.company.findFirst()
    if (!company) {
      return NextResponse.json({ error: "自社情報を先に登録してください" }, { status: 400 })
    }

    // 既存の画像があれば削除
    if (company.sealImagePath) {
      try {
        await del(company.sealImagePath)
      } catch (error) {
        console.warn("Failed to delete old seal image:", error)
      }
    }

    // Vercel Blobにアップロード
    const blob = await put(`company-seal-${Date.now()}.${file.name.split('.').pop()}`, file, {
      access: "public",
    })

    // データベース更新
    const updatedCompany = await prisma.company.update({
      where: { id: company.id },
      data: { sealImagePath: blob.url },
    })

    return NextResponse.json({ 
      company: updatedCompany,
      message: "会社印をアップロードしました" 
    })
  } catch (error) {
    console.error("Seal upload error:", error)
    return NextResponse.json({ error: "会社印のアップロードに失敗しました" }, { status: 500 })
  }
}

// DELETE - 会社印削除
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    // 管理者権限チェック
    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 })
    }

    const company = await prisma.company.findFirst()
    if (!company || !company.sealImagePath) {
      return NextResponse.json({ error: "削除する会社印がありません" }, { status: 400 })
    }

    // Vercel Blobから削除
    try {
      await del(company.sealImagePath)
    } catch (error) {
      console.warn("Failed to delete seal image from blob:", error)
    }

    // データベース更新
    const updatedCompany = await prisma.company.update({
      where: { id: company.id },
      data: { sealImagePath: null },
    })

    return NextResponse.json({ 
      company: updatedCompany,
      message: "会社印を削除しました" 
    })
  } catch (error) {
    console.error("Seal delete error:", error)
    return NextResponse.json({ error: "会社印の削除に失敗しました" }, { status: 500 })
  }
}