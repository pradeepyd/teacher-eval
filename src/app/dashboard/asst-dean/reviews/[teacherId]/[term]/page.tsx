'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RoleGuard from '@/components/RoleGuard'
import DashboardLayout from '@/components/DashboardLayout'
import ReviewForm from '@/components/ReviewForm'

type PageProps = any

export default function AsstDeanReviewPage({ params }: PageProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const { teacherId, term } = params

  const handleSubmit = async (data: {
    comments: string
    scores: { [key: string]: number }
    submitted: boolean
  }) => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/reviews/asst-dean', {
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
        const message = data.submitted ? 'Review submitted successfully!' : 'Review saved as draft!'
        setSuccess(message)
        
        if (data.submitted) {
          setTimeout(() => {
            router.push('/dashboard/asst-dean/reviews')
          }, 2000)
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to save review')
      }
    } catch (error) {
      setError('Error saving review')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/dashboard/asst-dean/reviews')
  }

  const getPageTitle = () => {
    return `Assistant Dean Review - ${term} Term`
  }

  return (
    <RoleGuard allowedRoles={['ASST_DEAN']}>
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

          <ReviewForm
            teacherId={teacherId}
            term={term}
            reviewerRole="ASST_DEAN"
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={loading}
          />
        </div>
      </DashboardLayout>
    </RoleGuard>
  )
}