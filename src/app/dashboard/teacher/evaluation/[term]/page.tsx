'use client'
/* eslint-disable @typescript-eslint/no-unused-vars */

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import RoleGuard from '@/components/RoleGuard'
import DashboardLayout from '@/components/DashboardLayout'
import EvaluationForm from '@/components/EvaluationForm'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type Params = { term: string }
export default function EvaluationPage({ params }: { params: Promise<Params> }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const resolved = use(params as Promise<Params>)
  const { term } = resolved

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingAnswers, setPendingAnswers] = useState<{ questionId: string; answer: string }[] | null>(null)
  const [pendingSelfComment, setPendingSelfComment] = useState<string>('')

  const submitNow = async (answers: { questionId: string; answer: string }[], selfComment: string) => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/teacher-answers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ answers, selfComment, term })
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

  const handleSubmit = (answers: { questionId: string; answer: string }[], selfComment: string) => {
    setPendingAnswers(answers)
    setPendingSelfComment(selfComment)
    setConfirmOpen(true)
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
            term={term as "START" | "END"}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={loading}
          />
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit Evaluation</DialogTitle>
                <DialogDescription>
                  Are you sure you want to submit your evaluation? You won’t be able to edit it afterwards.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={loading}>Cancel</Button>
                <Button
                  onClick={() => {
                    if (pendingAnswers) submitNow(pendingAnswers, pendingSelfComment).finally(() => setConfirmOpen(false))
                  }}
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : 'Confirm Submit'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </RoleGuard>
  )
}