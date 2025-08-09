'use client'

import { SessionProvider } from 'next-auth/react'

export default function Providers({
  children,
  session
}: {
  children: React.ReactNode
  session: unknown
}) {
  return <SessionProvider session={session as any}>{children}</SessionProvider>
}