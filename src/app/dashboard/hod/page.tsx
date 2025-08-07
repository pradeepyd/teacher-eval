'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import RoleGuard from '@/components/RoleGuard'
import DashboardLayout from '@/components/DashboardLayout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Eye, Trash2, Save, Send, Loader2 } from 'lucide-react'

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

  // Question form state
  const [newQuestion, setNewQuestion] = useState({
    question: '',
    type: 'TEXT' as 'TEXT' | 'TEXTAREA' | 'MCQ' | 'CHECKBOX',
    options: [''],
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

  // Add new question
  const addQuestion = async () => {
    if (!newQuestion.question.trim()) return

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
          options: (newQuestion.type === 'MCQ' || newQuestion.type === 'CHECKBOX') 
            ? newQuestion.options.filter(opt => opt.trim()) 
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
    }
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
                    Department: Computer Science
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Add Question Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Add New Question
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Question Text</label>
                    <Textarea
                      value={newQuestion.question}
                      onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                      placeholder="Enter your question..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Answer Type</label>
                    <Select
                      value={newQuestion.type}
                      onValueChange={(value) => 
                        setNewQuestion({ ...newQuestion, type: value as 'TEXT' | 'TEXTAREA' | 'MCQ' | 'CHECKBOX' })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TEXT">Short Text</SelectItem>
                        <SelectItem value="TEXTAREA">Long Text</SelectItem>
                        <SelectItem value="MCQ">Radio (Single Choice)</SelectItem>
                        <SelectItem value="CHECKBOX">Checkbox (Multiple Choice)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(newQuestion.type === 'MCQ' || newQuestion.type === 'CHECKBOX') && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Options</label>
                      {newQuestion.options.map((option, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <Input
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...newQuestion.options]
                              newOptions[index] = e.target.value
                              setNewQuestion({ ...newQuestion, options: newOptions })
                            }}
                            placeholder={`Option ${index + 1}`}
                          />
                          {newQuestion.options.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newOptions = newQuestion.options.filter((_, i) => i !== index)
                                setNewQuestion({ ...newQuestion, options: newOptions })
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
                          options: [...newQuestion.options, '']
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

                  <Button 
                    onClick={addQuestion} 
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    Add Question
                  </Button>
                </CardContent>
              </Card>

              {/* Questions List */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Questions ({questions.length})</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {questions.map((question, index) => (
                      <Card key={question.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium">Q{index + 1}.</span>
                                <span>{question.question}</span>
                                {question.required && (
                                  <Badge variant="destructive" className="text-xs">Required</Badge>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                Type: {question.type.replace('_', ' ')}
                              </div>
                              {question.options && question.options.length > 0 && (
                                <div className="mt-2">
                                  <div className="text-sm text-gray-600">Options:</div>
                                  <ul className="list-disc list-inside text-sm text-gray-500">
                                    {question.options.map((option, i) => (
                                      <li key={i}>{option}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteQuestion(question.id)}
                              disabled={loading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab 2: Evaluate Teachers */}
          <TabsContent value="evaluate" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {teachers.map((teacher) => (
                <Card key={teacher.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{teacher.name}</CardTitle>
                        <p className="text-sm text-gray-500">{teacher.email}</p>
                      </div>
                      <Badge variant={getStatusColor(teacher.status)}>
                        {getStatusText(teacher.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Accordion type="single" collapsible>
                      <AccordionItem value="answers">
                        <AccordionTrigger>View Teacher Answers</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3">
                            {Object.entries(teacher.answers).map(([questionId, answer]) => (
                              <div key={questionId} className="border-l-2 border-gray-200 pl-4">
                                <div className="text-sm font-medium text-gray-700">
                                  Question {questionId}
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
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">HOD Comment</label>
                        <Textarea
                          value={teacher.hodComment}
                          onChange={(e) => updateTeacherEvaluation(teacher.id, 'hodComment', e.target.value)}
                          placeholder="Add your evaluation comment..."
                          rows={3}
                          disabled={!teacher.canReview}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Points (1-10)</label>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          value={teacher.hodScore}
                          onChange={(e) => updateTeacherEvaluation(teacher.id, 'hodScore', parseInt(e.target.value) || 0)}
                          placeholder="Enter points..."
                          disabled={!teacher.canReview}
                        />
                      </div>
                    </div>

                    {teacher.canReview && (
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" disabled={loading}>
                          <Save className="h-4 w-4 mr-2" />
                          Save Draft
                        </Button>
                        <Button
                          onClick={() => submitTeacherEvaluation(teacher.id)}
                          disabled={loading || teacher.status === 'REVIEWED'}
                        >
                          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                          Submit Evaluation
                        </Button>
                      </div>
                    )}
                  </CardContent>
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