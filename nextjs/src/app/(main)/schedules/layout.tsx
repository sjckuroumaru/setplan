import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "予定実績管理",
}

export default function SchedulesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
