import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "見積詳細",
}

export default function EstimateDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
