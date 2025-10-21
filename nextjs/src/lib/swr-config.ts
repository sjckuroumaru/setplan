import { SWRConfiguration } from 'swr'

export const swrConfig: SWRConfiguration = {
  // 再検証設定
  revalidateOnFocus: false,          // タブフォーカス時の再検証を無効
  revalidateOnReconnect: true,       // 再接続時は再検証
  revalidateIfStale: true,           // 古いデータの場合は再検証

  // キャッシュ設定
  dedupingInterval: 5000,            // 5秒以内の重複リクエストを防ぐ

  // エラーハンドリング
  shouldRetryOnError: true,
  errorRetryCount: 3,
  errorRetryInterval: 5000,

  // その他
  suspense: false,                   // Suspenseモードは使用しない
}
