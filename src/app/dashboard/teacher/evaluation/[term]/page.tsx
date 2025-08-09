'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import RoleGuard from '@/components/RoleGuard'
import DashboardLayout from '@/components/DashboardLayout'
import EvaluationForm from '@/components/EvaluationForm'

type Params = { term: string }
type PageProps = { params: Promise<Params> } | { params: Params }

export default function EvaluationPage({ params }: PageProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const resolved = (params as any)?.then ? use(params as Promise<Params>) : (params as Params)
  const { term } = resolved

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
        toast.success('Evaluation submitted successfully')
        setTimeout(() => {
          router.push('/dashboard/teacher')
        }, 1500)
      } else {
        const errorData = await response.json()
        const msg = errorData.error || 'Failed to submit evaluation'
        setError(msg)
        toast.error(msg)
      }
    } catch (error) {
      setError('Error submitting evaluation')
      toast.error('Error submitting evaluation')
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
      <DashboardLayout title={getPageTitle()} showTitle={false}>
        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Success toast shown instead of inline banner */}

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