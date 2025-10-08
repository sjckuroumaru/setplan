import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "請求編集",
}

export default function EditInvoiceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
