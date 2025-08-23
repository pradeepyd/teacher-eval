'use client'
/* eslint-disable @typescript-eslint/no-unused-vars */

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import RoleGuard from '@/components/RoleGuard'
import DashboardLayout from '@/components/DashboardLayout'
import EvaluationForm from '@/components/EvaluationForm'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useTeacherData } from '@/hooks/useTeacherData'

type Params = { term: string }
export default function EvaluationPage({ params }: { params: Promise<Params> }) {
  const { submitAnswers, loading: hookLoading, error: hookError, fetchQuestions } = useTeacherData()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [questions, setQuestions] = useState<any[]>([])
  const [evaluationData, setEvaluationData] = useState<any>(null)
  const router = useRouter()

  const resolved = use(params as Promise<Params>)
  const { term } = resolved

  const [confirmOpen, setConfirmOpen] = useState(false)
  
  // Fetch questions when component mounts
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const data = await fetchQuestions(term as 'START' | 'END')
        setQuestions(data.questions || [])
        setEvaluationData(data)
      } catch (error) {
        // Handle error silently
      }
    }
    loadQuestions()
  }, [term, fetchQuestions])

  // Create a stable reference for evaluationData to prevent unnecessary re-renders
  const stableEvaluationData = evaluationData ? {
    existingSelfComment: evaluationData.existingSelfComment,
    isSubmitted: evaluationData.isSubmitted,
    canEdit: evaluationData.canEdit,
    questions: evaluationData.questions
  } : null
  const [pendingAnswers, setPendingAnswers] = useState<{ questionId: string; answer: string }[] | null>(null)
  const [pendingSelfComment, setPendingSelfComment] = useState<string>('')

  const submitNow = async (answers: { questionId: string; answer: string }[], selfComment: string) => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Transform answers to include questionType
      const transformedAnswers = answers.map(answer => {
        const question = questions.find(q => q.id === answer.questionId)
        return {
          questionId: answer.questionId,
          answer: answer.answer,
          questionType: question?.type || 'TEXT'
        }
      })
      
      await submitAnswers(transformedAnswers, selfComment, term as 'START' | 'END')
      toast.success('Evaluation submitted successfully')
      setTimeout(() => {
        router.push('/dashboard/teacher')
      }, 1500)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error submitting evaluation'
      setError(msg)
      toast.error(msg)
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
          {(error || hookError) && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error || hookError}
            </div>
          )}

          {/* Success toast shown instead of inline banner */}

          <EvaluationForm
            term={term as "START" | "END"}
            questions={questions}
            evaluationData={stableEvaluationData}
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