import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "顧客管理",
}

export default function CustomersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
