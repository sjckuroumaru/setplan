import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "課題編集",
}

export default function EditIssueLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
