'use client'
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import RoleGuard from '@/components/RoleGuard'
import DashboardLayout from '@/components/DashboardLayout'
import EvaluationForm from '@/components/EvaluationForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { useTeacherData } from '@/hooks/useTeacherData'
import { PageErrorBoundary } from '@/components/ErrorBoundary'

interface Evaluation {
  id: string
  teacherId: string
  term: string
  status: 'draft' | 'submitted' | 'completed'
  questions: Array<{
    id: string
    text: string
    type: 'text' | 'textarea' | 'radio' | 'checkbox'
    options?: string[]
  }>
  answers: Record<string, any>
  comments: string
  createdAt: string
  updatedAt: string
}

function EvaluationPageContent() {
  const params = useParams()
  const evaluationId = params.id as string
  const { fetchEvaluation, updateEvaluation, loading, error } = useTeacherData()
  
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [localLoading, setLocalLoading] = useState(true)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    const loadEvaluation = async () => {
      try {
        setLocalLoading(true)
        setLocalError('')
        const data = await fetchEvaluation(evaluationId)
        setEvaluation(data)
      } catch (_err) {
        setLocalError('Error fetching evaluation')
      } finally {
        setLocalLoading(false)
      }
    }

    if (evaluationId) {
      loadEvaluation()
    }
  }, [evaluationId, fetchEvaluation])

  const handleSaveDraft = async (answers: Record<string, any>, comments: string) => {
    try {
      await updateEvaluation(evaluationId, { answers, comments, status: 'draft' } as any)
      // Update local state
      setEvaluation(prev => prev ? { ...prev, answers, comments, status: 'draft' } : null)
    } catch (_err) {
      setLocalError('Error saving draft')
    }
  }

  const handleSubmit = async (answers: Record<string, any>, comments: string) => {
    try {
      await updateEvaluation(evaluationId, { answers, comments, status: 'submitted' } as any)
      // Update local state
      setEvaluation(prev => prev ? { ...prev, answers, comments, status: 'submitted' } : null)
    } catch (_err) {
      setLocalError('Error submitting evaluation')
    }
  }

  if (localLoading) {
    return (
      <RoleGuard allowedRoles={['TEACHER']}>
        <DashboardLayout title="Teacher Evaluation">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading evaluation...</span>
            </div>
          </div>
        </DashboardLayout>
      </RoleGuard>
    )
  }

  if (error) {
    return (
      <RoleGuard allowedRoles={['TEACHER']}>
        <DashboardLayout title="Teacher Evaluation">
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="text-destructive text-sm">{error}</div>
            </CardContent>
          </Card>
        </DashboardLayout>
      </RoleGuard>
    )
  }

  if (!evaluation) {
    return (
      <RoleGuard allowedRoles={['TEACHER']}>
        <DashboardLayout title="Teacher Evaluation">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <p className="text-gray-500">Evaluation not found</p>
              </div>
            </CardContent>
          </Card>
        </DashboardLayout>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard allowedRoles={['TEACHER']}>
      <DashboardLayout title="Teacher Evaluation">
        <div className="space-y-6">
          {/* Evaluation Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Evaluation Form</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Term: {evaluation.term} • Created: {new Date(evaluation.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge 
                  variant={
                    evaluation.status === 'submitted' ? 'default' : 
                    evaluation.status === 'completed' ? 'secondary' : 'outline'
                  }
                >
                  {evaluation.status.charAt(0).toUpperCase() + evaluation.status.slice(1)}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Evaluation Form (aligned with current props) */}
          <EvaluationForm
            term={(evaluation.term === 'START' ? 'START' : 'END')}
            onSubmit={(items, selfComment) => {
              const answersRecord = Object.fromEntries(items.map(i => [i.questionId, i.answer]))
              return handleSubmit(answersRecord, selfComment)
            }}
            onCancel={() => {}}
            loading={false}
          />
        </div>
      </DashboardLayout>
    </RoleGuard>
  )
}

export default function EvaluationPage() {
  return (
    <PageErrorBoundary pageName="Evaluation Page">
      <EvaluationPageContent />
    </PageErrorBoundary>
  )
}
