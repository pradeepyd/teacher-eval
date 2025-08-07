'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RoleGuard from '@/components/RoleGuard'
import DashboardLayout from '@/components/DashboardLayout'
import EvaluationForm from '@/components/EvaluationForm'

interface PageProps {
  params: {
    term: 'START' | 'END'
  }
}

export default function EvaluationPage({ params }: PageProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const { term } = params

  const handleSubmit = async (answers: { questionId: string; answer: string }[], selfComment: string) => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/teacher-answers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          answers,
          selfComment,
          term
        })
      })

      if (response.ok) {
        setSuccess('Evaluation submitted successfully!')
        setTimeout(() => {
          router.push('/dashboard/teacher')
        }, 2000)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to submit evaluation')
      }
    } catch (error) {
      setError('Error submitting evaluation')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/dashboard/teacher')
  }

  const getPageTitle = () => {
    switch (term) {
      case 'START': return 'Start of Year Evaluation'
      case 'END': return 'End of Year Evaluation'
      default: return 'Evaluation'
    }
  }

  return (
    <RoleGuard allowedRoles={['TEACHER']}>
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

          <EvaluationForm
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