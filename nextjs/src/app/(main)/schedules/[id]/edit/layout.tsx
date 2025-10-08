import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "予定実績編集",
}

export default function EditScheduleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
