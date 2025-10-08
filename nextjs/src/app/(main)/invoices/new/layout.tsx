import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "新規請求作成",
}

export default function NewInvoiceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
