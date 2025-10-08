import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "発注編集",
}

export default function EditPurchaseOrderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
