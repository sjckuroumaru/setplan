import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "見積編集",
}

export default function EditEstimateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
