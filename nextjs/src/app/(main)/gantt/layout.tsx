import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "ガントチャート",
}

export default function GanttLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
