import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "新規見積作成",
}

export default function NewEstimateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
