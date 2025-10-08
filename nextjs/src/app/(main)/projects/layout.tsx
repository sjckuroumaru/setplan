import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "案件管理",
}

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
