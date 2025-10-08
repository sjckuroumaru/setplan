import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "請求詳細",
}

export default function InvoiceDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
