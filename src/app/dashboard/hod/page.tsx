'use client'
/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import RoleGuard from '@/components/RoleGuard'
import DashboardLayout from '@/components/DashboardLayout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Plus, Trash2, Save, Send, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

interface Question {
  id: string
  question: string
  type: 'TEXT' | 'TEXTAREA' | 'MCQ' | 'CHECKBOX'
  options?: string[]
  required: boolean
  order: number
}

interface Teacher {
  id: string
  name: string
  email: string
  status: string
  answers: Record<string, string>
  selfComment: string
  hodComment: string
  hodScore: number
  canReview: boolean
  rubric?: Record<string, number>
}

interface TeacherAnswer {
  id: string
  questionId: string
  answer: string
  question: {
    id: string
    question: string
    type: string
    options?: string[]
  }
}

export default function HodDashboard() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('questions')
  const [questions, setQuestions] = useState<Question[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTerm, setActiveTerm] = useState<'START' | 'END' | null>(null)
  const [visibility, setVisibility] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT')
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false)
  const [openTeacherId, setOpenTeacherId] = useState<string | null>(null)

  // Question form state
  const [newQuestion, setNewQuestion] = useState({
    question: '',
    type: 'TEXT' as 'TEXT' | 'TEXTAREA' | 'MCQ' | 'CHECKBOX',
    options: [''],
    optionScores: [0] as number[],
    required: false,
  })

  // Fetch questions
  const fetchQuestions = async () => {
    try {
      const response = await fetch('/api/questions')
      if (!response.ok) {
        throw new Error('Failed to fetch questions')
      }
      const data = await response.json()
      setQuestions(data.questions || [])
    } catch (error) {
      console.error('Error fetching questions:', error)
      setError('Failed to load questions')
    }
  }

  // Fetch teachers for evaluation
  const fetchTeachers = async () => {
    try {
      const response = await fetch('/api/reviews/hod/teacher-data')
      if (!response.ok) {
        throw new Error('Failed to fetch teachers')
      }
      const data = await response.json()
      setTeachers(data.teachers || [])
    } catch (error) {
      console.error('Error fetching teachers:', error)
      setError('Failed to load teachers')
    }
  }

  // Fetch active term for HOD department
  const fetchTermState = async () => {
    const deptId = (session as any)?.user?.departmentId
    if (!deptId) return
    try {
      const response = await fetch(`/api/departments/${deptId}/term-state`)
      if (response.ok) {
        const data = await response.json()
        setActiveTerm(data.activeTerm || null)
        if (data.visibility) setVisibility(data.visibility)
      }
    } catch (e) {
      // ignore
    }
  }

  // Add new question
  const addQuestion = async () => {
    if (!newQuestion.question.trim()) return
    if (!activeTerm) {
      setError('No active term set for your department')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: newQuestion.question.trim(),
          type: newQuestion.type,
          term: activeTerm,
          options: (newQuestion.type === 'MCQ' || newQuestion.type === 'CHECKBOX') 
            ? newQuestion.options.filter(opt => opt.trim()) 
            : [],
          optionScores: (newQuestion.type === 'MCQ' || newQuestion.type === 'CHECKBOX')
            ? newQuestion.optionScores.slice(0, newQuestion.options.length)
            : [],
          required: newQuestion.required,
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add question')
      }

      setSuccess('Question added successfully!')
      setNewQuestion({
        question: '',
        type: 'TEXT' as 'TEXT' | 'TEXTAREA' | 'MCQ' | 'CHECKBOX',
        options: [''],
        optionScores: [0],
        required: false,
      })
      
      // Refresh questions
      await fetchQuestions()
    } catch (error) {
      console.error('Error adding question:', error)
      setError(error instanceof Error ? error.message : 'Failed to add question')
    } finally {
      setLoading(false)
    }
  }

  // Delete question
  const deleteQuestion = async (questionId: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/questions/${questionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete question')
      }

      setSuccess('Question deleted successfully!')
      await fetchQuestions()
    } catch (error) {
      console.error('Error deleting question:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete question')
    } finally {
      setLoading(false)
    }
  }

  // Update teacher evaluation
  const updateTeacherEvaluation = (teacherId: string, field: string, value: any) => {
    setTeachers(teachers.map(teacher => 
      teacher.id === teacherId 
        ? { ...teacher, [field]: value }
        : teacher
    ))
  }

  // Submit teacher evaluation
  const submitTeacherEvaluation = async (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId)
    if (!teacher) return
    if (!activeTerm) {
      setError('No active term set for your department')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/reviews/hod', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacherId: teacherId,
          comment: teacher.hodComment,
          score: teacher.hodScore,
          scores: teacher.rubric || {},
          term: activeTerm,
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit evaluation')
      }

      setSuccess('Evaluation submitted successfully!')
      
      // Update local state
      setTeachers(teachers.map(t => 
        t.id === teacherId 
          ? { ...t, status: 'REVIEWED', canReview: false }
          : t
      ))
      setOpenTeacherId(null)
    } catch (error) {
      console.error('Error submitting evaluation:', error)
      setError(error instanceof Error ? error.message : 'Failed to submit evaluation')
    } finally {
      setLoading(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    if (session?.user) {
      fetchQuestions()
      fetchTeachers()
      fetchTermState()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NOT_STARTED': return 'destructive'
      case 'IN_PROGRESS': return 'secondary'
      case 'SUBMITTED': return 'default'
      case 'REVIEWED': return 'default'
      default: return 'secondary'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'NOT_STARTED': return 'Not Started'
      case 'IN_PROGRESS': return 'In Progress'
      case 'SUBMITTED': return 'Submitted'
      case 'REVIEWED': return 'Reviewed'
      default: return status
    }
  }

  if (!session?.user) {
    return (
      <RoleGuard allowedRoles={['HOD']}>
        <DashboardLayout title="Head of Department Dashboard">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </DashboardLayout>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard allowedRoles={['HOD']}>
      <DashboardLayout title="Head of Department Dashboard">
        <div className="mb-6">
          <Card className="bg-gradient-to-r from-green-50 to-emerald-100">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Welcome, {session.user.name}!
                  </h2>
                  <p className="text-gray-600">
                    Department: {(session as any)?.user?.departmentName || '—'}
                  </p>
                </div>
                <Badge variant="outline" className="text-base">Head of Department</Badge>
              </div>
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="questions">Question Management</TabsTrigger>
            <TabsTrigger value="evaluate">Evaluate Teachers</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          {/* Tab 1: Question Management */}
          <TabsContent value="questions" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* LEFT: Add Question + List */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Add New Question
                    </CardTitle>
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            setLoading(true)
                            const res = await fetch('/api/questions/template/rubric', { method: 'POST' })
                            const data = await res.json().catch(() => ({}))
                            if (!res.ok) throw new Error(data.error || 'Failed to insert rubric')
                            setSuccess(data.message || 'Rubric inserted')
                            await fetchQuestions()
                          } catch (e) {
                            setError(e instanceof Error ? e.message : 'Failed to insert rubric')
                          } finally {
                            setLoading(false)
                          }
                        }}
                        disabled={loading || !activeTerm}
                      >
                        Insert Rubric Template
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                  
                    <div>
                      <label className="block text-sm font-medium mb-2">Question Text <span className="text-destructive">*</span></label>
                      <Textarea
                        value={newQuestion.question}
                        onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                        placeholder="Enter your evaluation question..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Answer Type <span className="text-destructive">*</span></label>
                      <Select
                        value={newQuestion.type}
                        onValueChange={(value) => 
                          setNewQuestion({ ...newQuestion, type: value as 'TEXT' | 'TEXTAREA' | 'MCQ' | 'CHECKBOX' })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select answer type..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TEXT">Short Text</SelectItem>
                          <SelectItem value="TEXTAREA">Long Text</SelectItem>
                          <SelectItem value="MCQ">MCQ (Single Choice)</SelectItem>
                          <SelectItem value="CHECKBOX">Checkbox (Multiple Choice)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">Choose the answer format for this question</p>
                    </div>

                    {(newQuestion.type === 'MCQ' || newQuestion.type === 'CHECKBOX') && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Options and Weights</label>
                        {newQuestion.options.map((option, index) => (
                          <div key={index} className="flex gap-2 mb-2 items-center">
                            <Input
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...newQuestion.options]
                                newOptions[index] = e.target.value
                                setNewQuestion({ ...newQuestion, options: newOptions })
                              }}
                              placeholder={`Option ${index + 1}`}
                              className="flex-1"
                            />
                            <Input
                              type="number"
                              value={newQuestion.optionScores[index] ?? 0}
                              onChange={(e) => {
                                const scores = [...newQuestion.optionScores]
                                scores[index] = parseInt(e.target.value) || 0
                                setNewQuestion({ ...newQuestion, optionScores: scores })
                              }}
                              className="w-24"
                              placeholder="Weight"
                            />
                            {newQuestion.options.length > 1 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newOptions = newQuestion.options.filter((_, i) => i !== index)
                                  const newScores = newQuestion.optionScores.filter((_, i) => i !== index)
                                  setNewQuestion({ ...newQuestion, options: newOptions, optionScores: newScores })
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setNewQuestion({
                            ...newQuestion,
                            options: [...newQuestion.options, ''],
                            optionScores: [...newQuestion.optionScores, 0],
                          })}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Option
                        </Button>
                      </div>

                    )}

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="required"
                        checked={newQuestion.required}
                        onCheckedChange={(checked) => setNewQuestion({ ...newQuestion, required: checked })}
                      />
                      <label htmlFor="required" className="text-sm font-medium">Required</label>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        onClick={addQuestion} 
                        disabled={loading}
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                        Add Question
                      </Button>
                    </div>
                  </CardContent>
                  )
                </Card>

                {/* Questions List */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Questions List</span>
                      <span className="text-sm text-muted-foreground">{questions.length} questions</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {questions.map((question, index) => (
                        <div key={question.id} className="flex items-start justify-between rounded-md border p-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">Question {index + 1}</span>
                              <Badge variant="outline">{question.type}</Badge>
                              {typeof (question as any).isActive === 'boolean' && !(question as any).isActive && (
                                <Badge variant="destructive">Disabled</Badge>
                              )}
                              {question.required && <Badge variant="destructive">Required</Badge>}
                            </div>
                            <div className="text-sm text-gray-700">{question.question}</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteQuestion(question.id)}
                            disabled={loading}
                            aria-label="Delete question"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {questions.length === 0 && (
                        <div className="text-center text-sm text-muted-foreground">No questions added yet. Create your first question above.</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* RIGHT: Live Preview */}
              <Card>
                <CardHeader className="flex items-center justify-between">
                  <CardTitle>Live Preview</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-xs rounded-full px-2 py-1 border">
                      Visibility: <span className={visibility==='PUBLISHED' ? 'text-green-700' : 'text-yellow-700'}>{visibility}</span>
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-300 text-gray-700 hover:bg-gray-100"
                      onClick={async () => { await fetchTermState(); }}
                    >Refresh</Button>

                    <AlertDialog open={publishConfirmOpen} onOpenChange={setPublishConfirmOpen}>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" disabled={!activeTerm || visibility==='PUBLISHED'} className="bg-blue-600 hover:bg-blue-700 text-white">Publish</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Publish questions for this term?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Publishing makes the form visible to all teachers in your department for the current term. This action can be done only once per term and cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            disabled={loading}
                            onClick={async () => {
                              const deptId = (session as any)?.user?.departmentId
                              if (!deptId || !activeTerm) return
                              setLoading(true)
                              setError(null)
                              try {
                                const res = await fetch(`/api/departments/${deptId}/term-state`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ activeTerm, visibility: 'PUBLISHED' })
                                })
                                if (!res.ok) {
                                  const data = await res.json().catch(() => ({}))
                                  throw new Error(data.error || 'Failed to publish')
                                }
                                setVisibility('PUBLISHED')
                                setSuccess('Questions published for teachers')
                              } catch (e) {
                                setError(e instanceof Error ? e.message : 'Failed to publish')
                              } finally {
                                setLoading(false)
                                setPublishConfirmOpen(false)
                              }
                            }}
                          >Confirm Publish</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {questions.length === 0 ? (
                    <div className="text-center text-muted-foreground py-10">
                      <div className="text-lg mb-1">Form Preview</div>
                      <div className="text-sm">Add questions to see how your evaluation form will look to users.</div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {questions.map((q, i) => (
                        <div key={q.id} className="rounded-md border p-3">
                          <div className="font-medium">Q{i + 1}. {q.question}</div>
                          <div className="text-xs text-muted-foreground mt-1">Type: {q.type}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Counters */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                    <div className="rounded-lg border p-4 text-center">
                      <div className="text-3xl font-bold">{questions.length}</div>
                      <div className="text-sm text-muted-foreground">Total Questions</div>
                    </div>
                    <div className="rounded-lg border p-4 text-center">
                      <div className="text-3xl font-bold">{questions.filter(q => (q as any).required).length}</div>
                      <div className="text-sm text-muted-foreground">Required Questions</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab 2: Evaluate Teachers */}
          <TabsContent value="evaluate" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {teachers.map((teacher, idx) => (
                <Card key={teacher.id} className="overflow-hidden">
                  <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>{teacher.name}</CardTitle>
                          <p className="text-sm text-gray-500">{teacher.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={getStatusColor(teacher.status)}
                            className={
                              teacher.status === 'SUBMITTED'
                                ? 'bg-emerald-100 text-emerald-700'
                                : teacher.status === 'IN_PROGRESS'
                                  ? 'bg-amber-100 text-amber-700'
                                  : teacher.status === 'NOT_STARTED'
                                    ? 'bg-rose-100 text-rose-700'
                                    : undefined
                            }
                          >
                            {getStatusText(teacher.status)}
                          </Badge>
                          <button
                            type="button"
                            aria-label={openTeacherId === teacher.id ? 'Collapse' : 'Expand'}
                            onClick={() => setOpenTeacherId(prev => (prev === teacher.id ? null : teacher.id))}
                            className="p-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100"
                          >
                            {openTeacherId === teacher.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                  </CardHeader>
                  {openTeacherId === teacher.id && (
                    <CardContent className="space-y-3">
                    <Separator />
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="review">
                        <AccordionTrigger
                          className="text-blue-600 hover:underline underline-offset-2 decoration-blue-400"
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/reviews/hod/teacher-data?teacherId=${teacher.id}&term=${activeTerm}`)
                              if (!res.ok) return
                              const detail = await res.json()
                              const answers: Record<string,string> = {}
                              detail.answers?.forEach((a: any) => { answers[a.question?.question || a.questionId] = a.answer })
                              setTeachers(prev => prev.map(t => t.id === teacher.id ? {
                                ...t,
                                answers,
                                selfComment: detail.selfComment || t.selfComment
                              } : t))
                            } catch {}
                          }}
                        >
                          <div className="w-full flex items-center justify-between">
                            <span>View Teacher Answers</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3">
                           {Object.keys(teacher.answers).length === 0 ? (
                              <div className="text-sm text-muted-foreground">No answers loaded. Click the row again to refresh.</div>
                            ) : (
                              <>
                                {Object.entries(teacher.answers).map(([questionText, answer], idx) => (
                                  <div key={questionText} className="border-l-2 border-gray-200 pl-4">
                                    <div className="text-sm font-medium text-gray-700">
                                      Q{idx + 1}: {questionText}
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1">{answer}</div>
                                  </div>
                                ))}
                                {teacher.selfComment && (
                                  <div className="border-l-2 border-blue-200 pl-4">
                                    <div className="text-sm font-medium text-gray-700">
                                      Teacher's Self Comment
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1">{teacher.selfComment}</div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                      {/* Left column: comment and points stacked */}
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col md:flex-row md:items-center md:gap-3">
                          <label className="text-sm font-medium mb-2 md:mb-0 md:w-40">HOD Comment</label>
                          <Textarea
                            value={teacher.hodComment}
                            onChange={(e) => updateTeacherEvaluation(teacher.id, 'hodComment', e.target.value)}
                            placeholder="Add your evaluation comment..."
                            rows={2}
                            className="min-h-0 md:flex-1"
                            disabled={!teacher.canReview}
                          />
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center md:gap-3">
                          <label className="text-sm font-medium mb-2 md:mb-0 md:w-40">Points (1-10)</label>
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            value={teacher.hodScore}
                            onChange={(e) => updateTeacherEvaluation(teacher.id, 'hodScore', parseInt(e.target.value) || 0)}
                            placeholder="Enter points..."
                            disabled={!teacher.canReview}
                            className="md:w-40"
                          />
                        </div>

                        {/* Rubric (1–5 per item) for teacher evaluation, similar to Asst. Dean HOD rubric */}
                        <div className="mt-2 space-y-3">
                          <div className="text-base md:text-lg font-semibold">Professionalism</div>
                          {['Compliance','Punctuality/Attendance','Ability to deal with students','Competence and Performance'].map((label, idx) => {
                            const key = `[Professionalism] ${label}`
                            const val = teacher.rubric?.[key] || 0
                            return (
                              <div key={key} className="flex items-center justify-between py-1">
                                <span className="text-sm"><span className="font-medium mr-2">{idx + 1}.</span>{label}</span>
                                <div className="flex gap-2">
                                  {[1,2,3,4,5].map(n => (
                                    <button
                                      key={n}
                                      type="button"
                                      onClick={() => teacher.canReview && updateTeacherEvaluation(teacher.id, 'rubric', { ...(teacher.rubric||{}), [key]: n })}
                                      className={`w-8 h-8 rounded border text-sm ${val===n ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                                      disabled={!teacher.canReview}
                                    >{n}</button>
                                  ))}
                                </div>
                              </div>
                            )
                          })}

                          <div className="text-base md:text-lg font-semibold mt-3">College Responsibilities</div>
                          {['Attending Non-Teaching Activities','Department Related Duties','Collegial Relationship','Ability to Deal with Supervisors','Participation in College Committees'].map((label, idx) => {
                            const key = `[Responsibilities] ${label}`
                            const val = teacher.rubric?.[key] || 0
                            return (
                              <div key={key} className="flex items-center justify-between py-1">
                                <span className="text-sm"><span className="font-medium mr-2">{idx + 1}.</span>{label}</span>
                                <div className="flex gap-2">
                                  {[1,2,3,4,5].map(n => (
                                    <button key={n} type="button" onClick={() => teacher.canReview && updateTeacherEvaluation(teacher.id, 'rubric', { ...(teacher.rubric||{}), [key]: n })} className={`w-8 h-8 rounded border text-sm ${val===n ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`} disabled={!teacher.canReview}>{n}</button>
                                  ))}
                                </div>
                              </div>
                            )
                          })}

                          <div className="text-base md:text-lg font-semibold mt-3">Professional Development</div>
                          {['In-Service Training','Research and Publications','National and International Conferences'].map((label, idx) => {
                            const key = `[Development] ${label}`
                            const val = teacher.rubric?.[key] || 0
                            return (
                              <div key={key} className="flex items-center justify-between py-1">
                                <span className="text-sm"><span className="font-medium mr-2">{idx + 1}.</span>{label}</span>
                                <div className="flex gap-2">
                                  {[1,2,3,4,5].map(n => (
                                    <button key={n} type="button" onClick={() => teacher.canReview && updateTeacherEvaluation(teacher.id, 'rubric', { ...(teacher.rubric||{}), [key]: n })} className={`w-8 h-8 rounded border text-sm ${val===n ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`} disabled={!teacher.canReview}>{n}</button>
                                  ))}
                                </div>
                              </div>
                            )
                          })}

                          {/* Engagement */}
                          <div className="text-base md:text-lg font-semibold mt-3">Student & Community Engagement</div>
                          {['Student Advising','Student Engagement','Community Engagement'].map((label, idx) => {
                            const key = `[Engagement] ${label}`
                            const val = teacher.rubric?.[key] || 0
                            return (
                              <div key={key} className="flex items-center justify-between py-1">
                                <span className="text-sm"><span className="font-medium mr-2">{idx + 1}.</span>{label}</span>
                                <div className="flex gap-2">
                                  {[1,2,3,4,5].map(n => (
                                    <button key={n} type="button" onClick={() => teacher.canReview && updateTeacherEvaluation(teacher.id, 'rubric', { ...(teacher.rubric||{}), [key]: n })} className={`w-8 h-8 rounded border text-sm ${val===n ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`} disabled={!teacher.canReview}>{n}</button>
                                  ))}
                                </div>
                              </div>
                            )
                          })}

                          <div className="text-xs text-gray-500">
                            {(() => {
                              const s = teacher.rubric || {}
                              const groups = [
                                Object.keys(s).filter(k => k.startsWith('[Professionalism]')),
                                Object.keys(s).filter(k => k.startsWith('[Responsibilities]')),
                                Object.keys(s).filter(k => k.startsWith('[Development]')),
                                Object.keys(s).filter(k => k.startsWith('[Engagement]')),
                              ]
                              const sum = (keys: string[]) => keys.reduce((acc, k) => acc + (s[k] || 0), 0)
                              const raw = groups.reduce((acc, g) => acc + sum(g), 0)
                              const max = groups.reduce((acc, g) => acc + g.length * 5, 0)
                              const normalized = max > 0 ? Math.round((raw / max) * 100) : 0
                              return <span>Estimated Total: {normalized}/100</span>
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Right column: actions stacked */}
                      <div className="flex flex-col items-stretch md:items-end gap-2 pt-1">
                        {teacher.canReview && (
                          <>
                            <Button variant="outline" className="w-full md:w-44 bg-gray-100 text-gray-700 hover:bg-gray-200 border-0" disabled={loading}>
                              <Save className="h-4 w-4 mr-2" />
                              Save Draft
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                              className="w-full md:w-44 bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={() => {}}
                              disabled={loading || teacher.status === 'REVIEWED'}
                            >
                              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                              Submit Evaluation
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Submit Evaluation?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to submit your review for {teacher.name}? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => submitTeacherEvaluation(teacher.id)} disabled={loading}>
                                    {loading ? 'Submitting...' : 'Confirm Submit'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Tab 3: Summary */}
          <TabsContent value="summary" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Total Questions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{questions.length}</div>
                  <p className="text-sm text-gray-500">Questions created</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Teachers Evaluated</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {teachers.filter(t => t.status === 'REVIEWED').length}
                  </div>
                  <p className="text-sm text-gray-500">Out of {teachers.length} teachers</p>
                  <Progress 
                    value={teachers.length > 0 ? (teachers.filter(t => t.status === 'REVIEWED').length / teachers.length) * 100 : 0} 
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Average Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">
                    {teachers.length > 0 
                      ? Math.round(teachers.reduce((sum, t) => sum + t.hodScore, 0) / teachers.length)
                      : 0
                    }/10
                  </div>
                  <p className="text-sm text-gray-500">Department average</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teachers.map((teacher) => (
                    <div key={teacher.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{teacher.name}</div>
                        <div className="text-sm text-gray-500">
                          Status: {getStatusText(teacher.status)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{teacher.hodScore}/10 points</div>
                        <div className="text-sm text-gray-500">
                          {teacher.status === 'REVIEWED' ? 'Completed' : 'Pending'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DashboardLayout>
    </RoleGuard>
  )
}