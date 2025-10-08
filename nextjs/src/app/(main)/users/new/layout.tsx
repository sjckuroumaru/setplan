import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "新規ユーザー作成",
}

export default function NewUserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
