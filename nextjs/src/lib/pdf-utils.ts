import { toast } from "sonner"

/**
 * PDFをダウンロードする共通関数
 * @param apiUrl - PDF生成APIのURL
 * @param filename - ダウンロード時のファイル名
 * @param successMessage - 成功時のメッセージ（デフォルト: "PDFをダウンロードしました"）
 * @param errorMessage - エラー時のメッセージ（デフォルト: "PDFのダウンロードに失敗しました"）
 */
export async function downloadPDF(
  apiUrl: string,
  filename: string,
  successMessage = "PDFをダウンロードしました",
  errorMessage = "PDFのダウンロードに失敗しました"
): Promise<void> {
  try {
    const response = await fetch(apiUrl)
    if (!response.ok) throw new Error("Failed to fetch PDF")
    
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    
    toast.success(successMessage)
  } catch (error) {
    console.error("PDF download error:", error)
    toast.error(errorMessage)
  }
}