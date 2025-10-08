import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "カレンダー",
}

export default function ScheduleCalendarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
