import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "納品書管理",
}

export default function DeliveryNotesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
