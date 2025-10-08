import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "ユーザー編集",
}

export default function EditUserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
