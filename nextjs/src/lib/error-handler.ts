import { toast } from "sonner"

/**
 * APIレスポンスのエラーハンドリング共通関数
 * @param response Response オブジェクト
 * @param defaultMessage デフォルトのエラーメッセージ
 * @returns エラーメッセージ
 */
export async function handleApiError(
  response: Response,
  defaultMessage: string = "エラーが発生しました"
): Promise<string> {
  let errorMessage = defaultMessage
  
  try {
    const data = await response.json()
    
    // エラーメッセージの取得優先順位
    if (data.error) {
      // 文字列のエラーメッセージ
      if (typeof data.error === "string") {
        errorMessage = data.error
      }
      // 配列形式のエラー（Zodバリデーションエラーなど）
      else if (Array.isArray(data.error)) {
        errorMessage = data.error.map((err: any) => {
          if (typeof err === "string") return err
          if (err.message) return err.message
          return JSON.stringify(err)
        }).join(", ")
      }
      // オブジェクト形式のエラー
      else if (typeof data.error === "object") {
        if (data.error.message) {
          errorMessage = data.error.message
        } else {
          errorMessage = JSON.stringify(data.error)
        }
      }
    } else if (data.message) {
      errorMessage = data.message
    }
  } catch (e) {
    // JSONパースエラーの場合はデフォルトメッセージを使用
    console.warn("Failed to parse error response:", e)
  }
  
  // toastでエラーを表示
  toast.error(errorMessage)
  
  // console.warnで記録
  console.warn(`API Error: ${errorMessage}`)
  
  return errorMessage
}

/**
 * 一般的なエラーハンドリング関数
 * @param error エラーオブジェクト
 * @param defaultMessage デフォルトのエラーメッセージ
 * @returns エラーメッセージ
 */
export function handleError(
  error: any,
  defaultMessage: string = "エラーが発生しました"
): string {
  let errorMessage = defaultMessage
  
  if (error instanceof Error) {
    errorMessage = error.message
  } else if (typeof error === "string") {
    errorMessage = error
  } else if (error && typeof error === "object") {
    if (error.message) {
      errorMessage = error.message
    } else {
      errorMessage = JSON.stringify(error)
    }
  }
  
  // toastでエラーを表示
  toast.error(errorMessage)
  
  // console.warnで記録
  console.warn(`Error: ${errorMessage}`)
  
  return errorMessage
}

/**
 * 削除操作用の共通ハンドラー
 * @param url API エンドポイントのURL
 * @param successMessage 成功時のメッセージ
 * @param errorMessage デフォルトのエラーメッセージ
 * @param onSuccess 成功時のコールバック
 * @returns 成功/失敗のブール値
 */
export async function handleDelete(
  url: string,
  successMessage: string,
  errorMessage: string = "削除に失敗しました",
  onSuccess?: () => void
): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "DELETE",
    })
    
    if (!response.ok) {
      await handleApiError(response, errorMessage)
      return false
    }
    
    toast.success(successMessage)
    onSuccess?.()
    return true
  } catch (error) {
    handleError(error, errorMessage)
    return false
  }
}