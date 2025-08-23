'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import type { SessionUser } from '@/types/api'
import { PageErrorBoundary } from '@/components/ErrorBoundary'

interface RoleGuardProps {
  allowedRoles: string[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

function RoleGuardContent({ 
  allowedRoles, 
  children, 
  fallback = <div>Access denied. You don&apos;t have permission to view this page.</div> 
}: RoleGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Still loading

    if (!session) {
      router.push('/login')
      return
    }

    const userRole = (session.user as SessionUser)?.role
    if (!userRole || !allowedRoles.includes(userRole)) {
      router.push('/unauthorized')
      return
    }
  }, [session, status, allowedRoles, router])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const userRole = (session?.user as SessionUser)?.role
  if (!session || !userRole || !allowedRoles.includes(userRole)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

export default function RoleGuard(props: RoleGuardProps) {
  return (
    <PageErrorBoundary pageName="Role Guard">
      <RoleGuardContent {...props} />
    </PageErrorBoundary>
  )
}