import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "課題詳細",
}

export default function IssueDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
