import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "新規納品書作成",
}

export default function NewDeliveryNoteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
