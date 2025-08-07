'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import RoleGuard from '@/components/RoleGuard'
import DashboardLayout from '@/components/DashboardLayout'
import EvaluationForm from '@/components/EvaluationForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

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

export default function EvaluationPage() {
  const params = useParams()
  const evaluationId = params.id as string
  
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchEvaluation = async () => {
      try {
        const response = await fetch(`/api/teacher-evaluation/${evaluationId}`)
        if (response.ok) {
          const data = await response.json()
          setEvaluation(data)
        } else {
          setError('Failed to fetch evaluation')
        }
      } catch (err) {
        setError('Error fetching evaluation')
      } finally {
        setLoading(false)
      }
    }

    if (evaluationId) {
      fetchEvaluation()
    }
  }, [evaluationId])

  const handleSaveDraft = async (answers: Record<string, any>, comments: string) => {
    try {
      const response = await fetch(`/api/teacher-evaluation/${evaluationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, comments, status: 'draft' })
      })

      if (response.ok) {
        // Update local state
        setEvaluation(prev => prev ? { ...prev, answers, comments, status: 'draft' } : null)
      } else {
        setError('Failed to save draft')
      }
    } catch (err) {
      setError('Error saving draft')
    }
  }

  const handleSubmit = async (answers: Record<string, any>, comments: string) => {
    try {
      const response = await fetch(`/api/teacher-evaluation/${evaluationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, comments, status: 'submitted' })
      })

      if (response.ok) {
        // Update local state
        setEvaluation(prev => prev ? { ...prev, answers, comments, status: 'submitted' } : null)
      } else {
        setError('Failed to submit evaluation')
      }
    } catch (err) {
      setError('Error submitting evaluation')
    }
  }

  if (loading) {
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

          {/* Evaluation Form */}
          <EvaluationForm
            questions={evaluation.questions}
            initialAnswers={evaluation.answers}
            initialComments={evaluation.comments}
            onSaveDraft={handleSaveDraft}
            onSubmit={handleSubmit}
            disabled={evaluation.status === 'submitted' || evaluation.status === 'completed'}
            autoSaveFeedback={true}
          />
        </div>
      </DashboardLayout>
    </RoleGuard>
  )
}
