import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "新規案件作成",
}

export default function NewProjectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
