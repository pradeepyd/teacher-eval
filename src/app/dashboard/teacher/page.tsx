'use client'
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import RoleGuard from '@/components/RoleGuard'
import DashboardLayout from '@/components/DashboardLayout'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Download, Eye, Play, CalendarDays } from 'lucide-react'
import Link from 'next/link'

interface Question {
  id: string
  type: 'TEXT' | 'TEXTAREA' | 'MCQ' | 'CHECKBOX'
  question: string
  options?: string[]
  existingAnswer?: string
}

interface EvaluationData {
  questions: Question[]
  existingSelfComment: string
  isSubmitted: boolean
  canEdit: boolean
}

interface EvaluationStatus {
  activeTerm: string | null
  start: {
    status: string
    questionsCount: number
    answersCount: number
    hasSelfComment: boolean
    canSubmit: boolean
    deadline?: string | null
  }
  end: {
    status: string
    questionsCount: number
    answersCount: number
    hasSelfComment: boolean
    canSubmit: boolean
    deadline?: string | null
  }
}

interface EvaluationCardProps {
  title: string
  subtitle: string
  term: 'START' | 'END'
  questionsCount: number
  answersCount: number
  status: string
  deadline?: string | null
  isSubmitted: boolean
}

const statusMap: Record<string, { label: string; color: string }> = {
  NOT_AVAILABLE: { label: 'Not Available', color: 'secondary' },
  NOT_STARTED: { label: 'Not Started', color: 'destructive' },
  IN_PROGRESS: { label: 'In Progress', color: 'secondary' },
  SUBMITTED: { label: 'Submitted', color: 'default' },
  REVIEWED: { label: 'Reviewed', color: 'success' },
}

function EvaluationCard({ title, subtitle, term, questionsCount, answersCount, status, deadline, isSubmitted }: EvaluationCardProps) {
  const progress = questionsCount ? Math.round((answersCount / questionsCount) * 100) : 0
  const submitted = status === 'SUBMITTED'
  const notAvailable = status === 'NOT_AVAILABLE'
  const isStart = term === 'START'
  const iconBg = submitted
    ? 'bg-emerald-100 text-emerald-700'
    : isStart
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-amber-100 text-amber-700'
  const deadlineClass = !submitted ? (isStart ? 'text-amber-600' : 'text-red-600') : ''
  return (
          <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className={`h-9 w-9 rounded-md flex items-center justify-center mt-0.5 ${iconBg}`}>
              {isStart ? (
                <Play className="h-4 w-4" />
              ) : (
                <CalendarDays className="h-4 w-4" />
              )}
            </div>
            <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{subtitle}</CardDescription>
            </div>
          </div>
                <Badge className={submitted ? 'bg-emerald-100 text-emerald-700' : status==='IN_PROGRESS' ? 'bg-amber-100 text-amber-700' : status==='NOT_STARTED' ? 'bg-rose-100 text-rose-700' : ''} variant={statusMap[status]?.color as any || 'secondary'}>
            {statusMap[status]?.label || status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress block */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900">Progress</span>
            <span className="text-sm text-gray-500">{progress}%</span>
          </div>
          <Progress value={progress} trackClassName="bg-gray-200" indicatorClassName="bg-green-500" />
        </div>

        {/* Meta rows */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">{submitted ? 'Submitted on:' : 'Deadline:'}</span>
          <span className={`font-medium text-gray-900 ${deadlineClass}`}>
            {submitted ? new Date().toLocaleDateString() : (deadline ? new Date(deadline).toLocaleDateString() : '—')}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Questions completed:</span>
          <span className="font-medium text-gray-900">{answersCount}/{questionsCount}</span>
        </div>

        {/* Actions */}
        <div className="mt-6 flex space-x-3">
          {submitted ? (
            <>
              <Button asChild className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors border-0">
                <Link href={`/dashboard/teacher/evaluation/${term}`}><Eye className="w-4 h-4 mr-2"/>View Submission</Link>
              </Button>
              <Button className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                <Download className="w-4 h-4 mr-2"/>Download PDF
              </Button>
            </>
          ) : notAvailable ? (
            <Button disabled className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium">Not Available</Button>
          ) : (
            <>
              <Button className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                Save Draft
              </Button>
              <Button asChild className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                <Link href={`/dashboard/teacher/evaluation/${term}`}><Play className="w-4 h-4 mr-2"/>Continue</Link>
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function TeacherDashboard() {
  const { data: session } = useSession()
  const [evaluationStatus, setEvaluationStatus] = useState<EvaluationStatus | null>(null)
  const [startData, setStartData] = useState<EvaluationData | null>(null)
  const [endData, setEndData] = useState<EvaluationData | null>(null)
  const [startAnswers, setStartAnswers] = useState<Record<string, string>>({})
  const [endAnswers, setEndAnswers] = useState<Record<string, string>>({})
  const [startComment, setStartComment] = useState('')
  const [endComment, setEndComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Fetch evaluation status
  const fetchEvaluationStatus = async () => {
    try {
      const response = await fetch('/api/teacher-evaluation/status')
      if (!response.ok) {
        throw new Error('Failed to fetch evaluation status')
      }
      const data = await response.json()
      setEvaluationStatus(data)
    } catch (error) {
      console.error('Error fetching evaluation status:', error)
      setError('Failed to load evaluation status')
    }
  }

  // Fetch evaluation data for a specific term
  const fetchEvaluationData = async (term: 'START' | 'END') => {
    try {
      const response = await fetch(`/api/teacher-evaluation/questions?term=${term}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch ${term} evaluation data`)
      }
      const data = await response.json()
      
      if (term === 'START') {
        setStartData(data)
        // Load existing answers
        const answers: Record<string, string> = {}
        data.questions.forEach((q: Question) => {
          if (q.existingAnswer) {
            answers[q.id] = q.existingAnswer
          }
        })
        setStartAnswers(answers)
        setStartComment(data.existingSelfComment || '')
      } else {
        setEndData(data)
        // Load existing answers
        const answers: Record<string, string> = {}
        data.questions.forEach((q: Question) => {
          if (q.existingAnswer) {
            answers[q.id] = q.existingAnswer
          }
        })
        setEndAnswers(answers)
        setEndComment(data.existingSelfComment || '')
      }
    } catch (error) {
      console.error(`Error fetching ${term} evaluation data:`, error)
      setError(`Failed to load ${term} evaluation data`)
    }
  }

  // Submit evaluation for a specific term
  const submitEvaluation = async (term: 'START' | 'END') => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const answers = term === 'START' ? startAnswers : endAnswers
      const comment = term === 'START' ? startComment : endComment
      const questions = term === 'START' ? startData?.questions : endData?.questions

      if (!questions) {
        throw new Error('No questions available')
      }

      // Validate all questions are answered
      const unansweredQuestions = questions.filter(q => !answers[q.id] || answers[q.id].trim() === '')
      if (unansweredQuestions.length > 0) {
        throw new Error(`Please answer all questions. ${unansweredQuestions.length} question(s) remaining.`)
      }

      if (!comment.trim()) {
        throw new Error('Please add a comment before submitting.')
      }

      const response = await fetch('/api/teacher-answers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers: questions.map(q => ({
            questionId: q.id,
            answer: answers[q.id]
          })),
          selfComment: comment.trim(),
          term
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit evaluation')
      }

      setSuccess(`Evaluation submitted successfully for ${term} term!`)
      
      // Refresh data
      await fetchEvaluationStatus()
      await fetchEvaluationData(term)
    } catch (error) {
      console.error('Error submitting evaluation:', error)
      setError(error instanceof Error ? error.message : 'Failed to submit evaluation')
    } finally {
      setLoading(false)
    }
  }

  // Save draft (just update local state for now)
  const saveDraft = (term: 'START' | 'END') => {
    setSuccess(`Draft saved for ${term} term`)
    setTimeout(() => setSuccess(null), 3000)
  }

  // Load data on component mount
  useEffect(() => {
    if (session?.user) {
      fetchEvaluationStatus()
      fetchEvaluationData('START')
      fetchEvaluationData('END')
    }
  }, [session])

  // Calculate progress
  // Compute counts
  const startQuestionsCount = startData?.questions.length || 0
  const endQuestionsCount = endData?.questions.length || 0
  const startAnswersCount = Object.keys(startAnswers).length
  const endAnswersCount = Object.keys(endAnswers).length

  if (!session?.user) {
    return (
      <RoleGuard allowedRoles={['TEACHER']}>
        <DashboardLayout title="Teacher Dashboard">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </DashboardLayout>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard allowedRoles={['TEACHER']}>
      <DashboardLayout title="Teacher Dashboard">
        <div className="mb-8">
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-100 shadow-md">
            <CardContent className="py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  Welcome, {session.user.name || 'Teacher'}!
                </div>
                <div className="text-sm text-gray-600">
                  Department: <span className="font-medium">{(session as any)?.user?.departmentName || '—'}</span>
                </div>
                {evaluationStatus?.activeTerm && (
                  <div className="text-sm text-blue-600 font-medium">
                    Active Term: {evaluationStatus.activeTerm}
                  </div>
                )}
              </div>
              <Badge variant="secondary" className="text-base">Teacher</Badge>
            </CardContent>
          </Card>
        </div>

        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <EvaluationCard
            title="Start of Year Assessment"
            subtitle="Self-evaluation and goal setting"
            term="START"
            questionsCount={startQuestionsCount}
            answersCount={startAnswersCount}
            status={evaluationStatus?.start.status || 'NOT_AVAILABLE'}
            deadline={evaluationStatus?.start.deadline || null}
            isSubmitted={startData?.isSubmitted || false}
          />
          <EvaluationCard
            title="End of Year Reflection"
            subtitle="Annual performance review"
            term="END"
            questionsCount={endQuestionsCount}
            answersCount={endAnswersCount}
            status={evaluationStatus?.end.status || 'NOT_AVAILABLE'}
            deadline={evaluationStatus?.end.deadline || null}
            isSubmitted={endData?.isSubmitted || false}
          />
        </div>
      </DashboardLayout>
    </RoleGuard>
  )
}