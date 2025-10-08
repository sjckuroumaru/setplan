import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "新規発注作成",
}

export default function NewPurchaseOrderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
