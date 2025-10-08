import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "請求管理",
}

export default function InvoicesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
