import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "新規顧客作成",
}

export default function NewCustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
