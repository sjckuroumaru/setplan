import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "顧客編集",
}

export default function EditCustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
