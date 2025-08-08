'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

interface DashboardLayoutProps {
  children: React.ReactNode
  title: string
  showBack?: boolean
}

export default function DashboardLayout({ children, title, showBack = true }: DashboardLayoutProps) {
  const { data: session } = useSession()
  const router = useRouter()

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' })
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <nav className="bg-white shadow-sm border-b fixed inset-x-0 top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-xl font-semibold text-gray-900">
                MCQ Teacher Evaluation
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                <span className="font-medium">{session?.user?.name}</span>
                <span className="ml-2 text-gray-500">({session?.user?.role})</span>
                <span className="ml-2 text-gray-500">{session?.user?.departmentName}</span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {showBack && (
            <div className="mb-2">
              <button
                aria-label="Back"
                onClick={() => {
                  if (window.history.length > 1) router.back()
                  else router.push('/admin')
                }}
                className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="ml-1 hidden sm:inline">Back</span>
              </button>
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  )
}