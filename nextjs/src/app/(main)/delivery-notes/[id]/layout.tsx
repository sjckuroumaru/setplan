import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "納品書詳細",
}

export default function DeliveryNoteDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
