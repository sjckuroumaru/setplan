// クライアントサイドとサーバーサイドの両方で動作するように設定
export const config = {
  pagination: {
    // サーバーサイドではDEFAULT_PAGINATION_LIMIT、クライアントサイドではNEXT_PUBLIC_DEFAULT_PAGINATION_LIMITを使用
    defaultLimit: parseInt(
      process.env.DEFAULT_PAGINATION_LIMIT || 
      process.env.NEXT_PUBLIC_DEFAULT_PAGINATION_LIMIT || 
      "10"
    ),
  },
}