import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "発注管理",
}

export default function PurchaseOrdersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
