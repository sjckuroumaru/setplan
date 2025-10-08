import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "予定実績分析",
}

export default function ScheduleChartLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
