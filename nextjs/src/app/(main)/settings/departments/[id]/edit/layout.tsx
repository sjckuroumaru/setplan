import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "部署編集",
}

export default function EditDepartmentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
