import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "部署・チーム管理",
}

export default function DepartmentsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
