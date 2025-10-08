import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "会社設定",
}

export default function CompanySettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
