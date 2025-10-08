import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "案件編集",
}

export default function EditProjectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
