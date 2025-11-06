import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "納品書編集",
}

export default function EditDeliveryNoteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
