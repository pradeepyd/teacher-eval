'use client'

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
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

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
  }
  end: {
    status: string
    questionsCount: number
    answersCount: number
    hasSelfComment: boolean
    canSubmit: boolean
  }
}

interface EvaluationCardProps {
  title: string
  term: 'START' | 'END'
  questions: Question[]
  status: string
  answers: Record<string, string>
  setAnswers: (answers: Record<string, string>) => void
  comment: string
  setComment: (comment: string) => void
  onSave: () => void
  onSubmit: () => void
  progress: number
  canSubmit: boolean
  isSubmitted: boolean
  loading: boolean
}

const statusMap: Record<string, { label: string; color: string }> = {
  NOT_AVAILABLE: { label: 'Not Available', color: 'secondary' },
  NOT_STARTED: { label: 'Not Started', color: 'destructive' },
  IN_PROGRESS: { label: 'In Progress', color: 'secondary' },
  SUBMITTED: { label: 'Submitted', color: 'default' },
  REVIEWED: { label: 'Reviewed', color: 'success' },
}

function EvaluationCard({
  title,
  term,
  questions,
  status,
  answers,
  setAnswers,
  comment,
  setComment,
  onSave,
  onSubmit,
  progress,
  canSubmit,
  isSubmitted,
  loading,
}: EvaluationCardProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {isSubmitted 
                ? 'Evaluation completed and submitted.' 
                : 'Complete all questions and submit your evaluation.'
              }
            </CardDescription>
          </div>
          <Badge variant={statusMap[status]?.color as any || 'secondary'}>
            {statusMap[status]?.label || status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress} />
        <Accordion type="single" collapsible className="w-full">
          {questions.map((q, idx) => (
            <AccordionItem value={String(q.id)} key={q.id}>
              <AccordionTrigger>
                <span className="font-medium">Q{idx + 1}. {q.question}</span>
              </AccordionTrigger>
              <AccordionContent>
                {q.type === 'MCQ' ? (
                  <div className="space-y-2">
                    {q.options?.map((opt, i) => (
                      <label key={i} className="flex items-center gap-2 cursor-pointer">
                        <Input
                          type="radio"
                          name={`q${q.id}`}
                          value={opt}
                          checked={answers[q.id] === opt}
                          onChange={() => setAnswers({ ...answers, [q.id]: opt })}
                          disabled={isSubmitted}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : q.type === 'CHECKBOX' ? (
                  <div className="space-y-2">
                    {q.options?.map((opt, i) => (
                      <label key={i} className="flex items-center gap-2 cursor-pointer">
                        <Input
                          type="checkbox"
                          name={`q${q.id}`}
                          value={opt}
                          checked={answers[q.id]?.includes(opt) || false}
                          onChange={(e) => {
                            const currentAnswers = answers[q.id]?.split(',').filter(Boolean) || []
                            if (e.target.checked) {
                              setAnswers({ 
                                ...answers, 
                                [q.id]: [...currentAnswers, opt].join(',') 
                              })
                            } else {
                              setAnswers({ 
                                ...answers, 
                                [q.id]: currentAnswers.filter(a => a !== opt).join(',') 
                              })
                            }
                          }}
                          disabled={isSubmitted}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : q.type === 'TEXT' ? (
                  <Input
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    placeholder="Type your answer..."
                    disabled={isSubmitted}
                  />
                ) : (
                  <Textarea
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    placeholder="Type your answer..."
                    disabled={isSubmitted}
                  />
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div>
          <label className="block text-sm font-medium mb-1">Comment</label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add any additional comments..."
            disabled={isSubmitted}
          />
        </div>
        {!isSubmitted && (
          <div className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={onSave} 
              type="button"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Draft'}
            </Button>
            <Button 
              onClick={onSubmit} 
              type="button"
              disabled={!canSubmit || loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit'}
            </Button>
          </div>
        )}
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
  const startProgress = startData?.questions.length 
    ? Math.round((Object.keys(startAnswers).length / startData.questions.length) * 100)
    : 0
  const endProgress = endData?.questions.length 
    ? Math.round((Object.keys(endAnswers).length / endData.questions.length) * 100)
    : 0

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
                  Department: <span className="font-medium">Computer Science</span>
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
            title="Start of Year Self-Assessment"
            term="START"
            questions={startData?.questions || []}
            status={evaluationStatus?.start.status || 'NOT_AVAILABLE'}
            answers={startAnswers}
            setAnswers={setStartAnswers}
            comment={startComment}
            setComment={setStartComment}
            onSave={() => saveDraft('START')}
            onSubmit={() => submitEvaluation('START')}
            progress={startProgress}
            canSubmit={evaluationStatus?.start.canSubmit || false}
            isSubmitted={startData?.isSubmitted || false}
            loading={loading}
          />
          <EvaluationCard
            title="End of Year Reflection"
            term="END"
            questions={endData?.questions || []}
            status={evaluationStatus?.end.status || 'NOT_AVAILABLE'}
            answers={endAnswers}
            setAnswers={setEndAnswers}
            comment={endComment}
            setComment={setEndComment}
            onSave={() => saveDraft('END')}
            onSubmit={() => submitEvaluation('END')}
            progress={endProgress}
            canSubmit={evaluationStatus?.end.canSubmit || false}
            isSubmitted={endData?.isSubmitted || false}
            loading={loading}
          />
        </div>
      </DashboardLayout>
    </RoleGuard>
  )
}