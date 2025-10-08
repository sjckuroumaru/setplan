import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "発注詳細",
}

export default function PurchaseOrderDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
