'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface RoleGuardProps {
  allowedRoles: string[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function RoleGuard({ 
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

    if (!allowedRoles.includes(session.user.role)) {
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

  if (!session || !allowedRoles.includes(session.user.role)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}