import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "新規課題作成",
}

export default function NewIssueLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
