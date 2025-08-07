'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RoleGuard from '@/components/RoleGuard'
import DashboardLayout from '@/components/DashboardLayout'
import DeanFinalReviewForm from '@/components/DeanFinalReviewForm'

interface PageProps {
  params: {
    teacherId: string
    term: 'START' | 'END'
  }
}

export default function DeanFinalReviewPage({ params }: PageProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const { teacherId, term } = params

  const handleSubmit = async (data: {
    finalComment: string
    finalScore: number
    status: 'PROMOTED' | 'ON_HOLD' | 'NEEDS_IMPROVEMENT'
    submitted: boolean
  }) => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/reviews/dean', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          teacherId,
          term,
          ...data
        })
      })

      if (response.ok) {
        const message = data.submitted 
          ? 'Final decision submitted successfully! This evaluation is now complete and immutable.' 
          : 'Final review saved as draft!'
        setSuccess(message)
        
        if (data.submitted) {
          setTimeout(() => {
            router.push('/dashboard/dean/reviews')
          }, 3000)
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to save final review')
      }
    } catch (error) {
      setError('Error saving final review')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/dashboard/dean/reviews')
  }

  const getPageTitle = () => {
    return `Dean Final Review - ${term} Term`
  }

  return (
    <RoleGuard allowedRoles={['DEAN']}>
      <DashboardLayout title={getPageTitle()}>
        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          <DeanFinalReviewForm
            teacherId={teacherId}
            term={term}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={loading}
          />
        </div>
      </DashboardLayout>
    </RoleGuard>
  )
}