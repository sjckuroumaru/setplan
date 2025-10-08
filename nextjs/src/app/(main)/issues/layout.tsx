import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "課題管理",
}

export default function IssuesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
