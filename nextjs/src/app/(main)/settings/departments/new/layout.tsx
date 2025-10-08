import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "新規部署作成",
}

export default function NewDepartmentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
