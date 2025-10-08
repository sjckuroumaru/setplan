import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "見積管理",
}

export default function EstimatesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
