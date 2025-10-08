import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "新規予定実績作成",
}

export default function NewScheduleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
