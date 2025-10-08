import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "EVM分析",
}

export default function EvmAnalysisLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
