"use client"

import { SessionProvider } from "next-auth/react"
import { Session } from "next-auth"
import { SWRConfig } from "swr"
import { swrConfig } from "@/lib/swr-config"
import { fetcher } from "@/lib/fetcher"

interface ProvidersProps {
  children: React.ReactNode
  session?: Session | null
}

export function Providers({ children, session }: ProvidersProps) {
  return (
    <SessionProvider session={session}>
      <SWRConfig value={{ ...swrConfig, fetcher }}>
        {children}
      </SWRConfig>
    </SessionProvider>
  )
}