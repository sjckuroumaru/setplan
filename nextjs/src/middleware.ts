import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware() {
    // 認証が必要なルートの追加処理があればここに記述
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
  }
)

export const config = {
  matcher: [
    // 認証が必要なルートを指定
    "/dashboard/:path*",
    "/users/:path*",
    "/projects/:path*",
    "/schedules/:path*",
    "/issues/:path*",
    "/gantt/:path*",
    "/api/((?!auth).)*" // API routes except auth
  ]
}