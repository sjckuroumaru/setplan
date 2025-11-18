"use client"

import { useState, useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import {
  Upload,
  File,
  FileText,
  Image as ImageIcon,
  Trash2,
  Download,
  Loader2,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Attachment {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  uploadedBy: string
  uploadedByName: string
  description: string | null
  createdAt: string
}

interface FileAttachmentsProps {
  estimateId: string
  isEditable?: boolean
}

// ファイルサイズを人間が読みやすい形式に変換
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

// ファイルタイプに応じたアイコンを返す
function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return <ImageIcon className="h-5 w-5" />
  } else if (mimeType === "application/pdf") {
    return <FileText className="h-5 w-5" />
  } else {
    return <File className="h-5 w-5" />
  }
}

export function FileAttachments({ estimateId, isEditable = false }: FileAttachmentsProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  // ファイル一覧を取得
  const fetchAttachments = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/estimates/${estimateId}/attachments`)
      if (!res.ok) throw new Error("Failed to fetch attachments")
      const data = await res.json()
      setAttachments(data.data || [])
    } catch (error) {
      console.error("Fetch attachments error:", error)
      toast.error("ファイル一覧の取得に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }, [estimateId])

  // 初回読み込み
  useEffect(() => {
    fetchAttachments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ファイルアップロード
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return
      if (attachments.length >= 10) {
        toast.error("添付ファイルは最大10個までです")
        return
      }

      const file = acceptedFiles[0]

      // ファイルサイズチェック
      if (file.size > 20 * 1024 * 1024) {
        toast.error("ファイルサイズは20MB以下にしてください")
        return
      }

      setIsUploading(true)
      try {
        const formData = new FormData()
        formData.append("file", file)

        const res = await fetch(`/api/estimates/${estimateId}/attachments`, {
          method: "POST",
          body: formData,
        })

        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || "Upload failed")
        }

        toast.success("ファイルをアップロードしました")
        await fetchAttachments()
      } catch (error) {
        console.error("Upload error:", error)
        toast.error(error instanceof Error ? error.message : "ファイルのアップロードに失敗しました")
      } finally {
        setIsUploading(false)
      }
    },
    [estimateId, attachments.length, fetchAttachments]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "text/plain": [".txt"],
    },
    maxFiles: 1,
    disabled: !isEditable || isUploading,
  })

  // ファイル削除
  const handleDelete = async (attachmentId: string) => {
    try {
      const res = await fetch(`/api/estimates/${estimateId}/attachments/${attachmentId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Delete failed")
      }

      toast.success("ファイルを削除しました")
      await fetchAttachments()
    } catch (error) {
      console.error("Delete error:", error)
      toast.error(error instanceof Error ? error.message : "ファイルの削除に失敗しました")
    } finally {
      setDeleteTargetId(null)
    }
  }

  // ファイルダウンロード（認証が必要）
  const handleDownload = async (attachmentId: string) => {
    try {
      const res = await fetch(`/api/estimates/${estimateId}/attachments/${attachmentId}/download`)

      if (!res.ok) {
        throw new Error("Download failed")
      }

      // ファイルをBlobとして取得
      const blob = await res.blob()

      // Blobから一時的なURLを作成
      const url = window.URL.createObjectURL(blob)

      // 新しいタブでファイルを開く
      window.open(url, "_blank")

      // 少し時間を置いてからメモリ解放（新しいタブでの読み込みを待つ）
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
      }, 100)
    } catch (error) {
      console.error("Download error:", error)
      toast.error("ファイルのダウンロードに失敗しました")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>関連ファイル</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditable && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-gray-300 hover:border-primary"
            } ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
          >
            <input {...getInputProps()} />
            <Upload className="h-10 w-10 mx-auto mb-4 text-gray-400" />
            {isUploading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p className="text-sm text-gray-600">アップロード中...</p>
              </div>
            ) : isDragActive ? (
              <p className="text-sm text-gray-600">ファイルをドロップしてください</p>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-2">
                  ファイルをドラッグ&ドロップ
                </p>
                <p className="text-xs text-gray-500 mb-4">または</p>
                <Button type="button" variant="outline" size="sm">
                  ファイルを選択
                </Button>
                <p className="text-xs text-gray-500 mt-4">
                  PDF、Word、Excel、画像、テキスト（最大20MB、10個まで）
                </p>
              </>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : attachments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            添付ファイルはありません
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 mb-2">
              添付ファイル一覧（{attachments.length}/10）
            </p>
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="text-gray-600 flex-shrink-0">
                    {getFileIcon(attachment.mimeType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {attachment.fileName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(attachment.fileSize)} |{" "}
                      {new Date(attachment.createdAt).toLocaleDateString("ja-JP")} |{" "}
                      {attachment.uploadedByName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(attachment.id)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {isEditable && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTargetId(attachment.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={() => setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ファイルを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。ファイルは完全に削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTargetId && handleDelete(deleteTargetId)}
              className="bg-red-600 hover:bg-red-700"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
