'use client'
/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import RoleGuard from '@/components/RoleGuard'
import DashboardLayout from '@/components/DashboardLayout'
import QuestionForm from '@/components/QuestionForm'
import { toast } from 'sonner'

interface Question {
  id: string
  question: string
  type: 'TEXT' | 'TEXTAREA' | 'MCQ' | 'CHECKBOX'
  term: 'START' | 'END'
  options: string[]
  order: number
  createdAt: string
  updatedAt: string
  department: {
    id: string
    name: string
  }
}

interface TermState {
  activeTerm: 'START' | 'END'
}

export default function QuestionsPage() {
  const { data: session } = useSession()
  const [questions, setQuestions] = useState<Question[]>([])
  const [termState, setTermState] = useState<TermState | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedTerm, setSelectedTerm] = useState<'START' | 'END' | 'ALL'>('ALL')

  const fetchQuestions = async () => {
    try {
      const response = await fetch('/api/questions')
      if (response.ok) {
        const data = await response.json()
        setQuestions(data)
      } else {
        setError('Failed to fetch questions')
        toast.error('Failed to fetch questions')
      }
    } catch (error) {
      setError('Error fetching questions')
      toast.error('Error fetching questions')
    }
  }

  const fetchTermState = async () => {
    if (!(session?.user as any)?.departmentId) return
    
    try {
      const response = await fetch(`/api/departments/${(session?.user as any)?.departmentId}/term-state`)
      if (response.ok) {
        const data = await response.json()
        setTermState(data)
      }
    } catch (error) {

    }
  }

  const handleCreateQuestion = async (questionData: any) => {
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(questionData)
      })

      if (response.ok) {
        setSuccess('Question created successfully')
        toast.success('Question created successfully')
        setShowForm(false)
        await fetchQuestions()
      } else {
        const errorData = await response.json()
        const msg = errorData.error || 'Failed to create question'
        setError(msg)
        toast.error(msg)
      }
    } catch (error) {
      setError('Error creating question')
      toast.error('Error creating question')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditQuestion = async (questionData: any) => {
    if (!editingQuestion) return

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/questions/${editingQuestion.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(questionData)
      })

      if (response.ok) {
        setSuccess('Question updated successfully')
        toast.success('Question updated successfully')
        setEditingQuestion(null)
        await fetchQuestions()
      } else {
        const errorData = await response.json()
        const msg = errorData.error || 'Failed to update question'
        setError(msg)
        toast.error(msg)
      }
    } catch (error) {
      setError('Error updating question')
      toast.error('Error updating question')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return

    try {
      const response = await fetch(`/api/questions/${questionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setSuccess('Question deleted successfully')
        toast.success('Question deleted successfully')
        await fetchQuestions()
      } else {
        const errorData = await response.json()
        const msg = errorData.error || 'Failed to delete question'
        setError(msg)
        toast.error(msg)
      }
    } catch (error) {
      setError('Error deleting question')
      toast.error('Error deleting question')
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchQuestions(), fetchTermState()])
      setLoading(false)
    }

    if ((session?.user as any)?.departmentId) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  const filteredQuestions = questions.filter(q => 
    selectedTerm === 'ALL' || q.term === selectedTerm
  )

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'TEXT': return 'Single Line Text'
      case 'TEXTAREA': return 'Multi Line Text'
      case 'MCQ': return 'Multiple Choice (Single)'
      case 'CHECKBOX': return 'Multiple Choice (Multiple)'
      default: return type
    }
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={['HOD']}>
        <DashboardLayout title="Question Management">
          <div className="flex items-center justify-center min-h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </DashboardLayout>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard allowedRoles={['HOD']}>
      <DashboardLayout title="Question Management">
        <div className="space-y-6">

          {/* Active Term Info */}
          {termState && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-blue-800">
                    Current Active Term: {termState.activeTerm}
                  </h3>
                  <p className="text-sm text-blue-700 mt-1">
                    You can only create questions for the active term
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  termState.activeTerm === 'START' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {termState.activeTerm} Term
                </span>
              </div>
            </div>
          )}

          {/* Actions Bar */}
          <div className="flex justify-between items-center">
            <div className="flex space-x-4">
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value as any)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="ALL">All Terms</option>
                <option value="START">Start of Year</option>
                <option value="END">End of Year</option>
              </select>
            </div>

            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Create New Question
            </button>
          </div>

          {/* Question Form */}
          {(showForm || editingQuestion) && (
            <QuestionForm
              onSubmit={editingQuestion ? handleEditQuestion : handleCreateQuestion}
              onCancel={() => {
                setShowForm(false)
                setEditingQuestion(null)
              }}
              initialData={editingQuestion || undefined}
              activeTerm={termState?.activeTerm || 'START'}
              loading={submitting}
            />
          )}

          {/* Questions List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Questions ({filteredQuestions.length})
              </h3>

              {filteredQuestions.length > 0 ? (
                <div className="space-y-4">
                  {filteredQuestions.map((question, index) => (
                    <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm font-medium text-gray-500">
                              #{question.order || index + 1}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              question.term === 'START' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {question.term}
                            </span>
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                              {getQuestionTypeLabel(question.type)}
                            </span>
                          </div>
                          
                          <p className="text-gray-900 mb-2">{question.question}</p>
                          
                          {question.options.length > 0 && (
                            <div className="ml-4">
                              <p className="text-sm text-gray-600 mb-1">Options:</p>
                              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                {question.options.map((option, idx) => (
                                  <li key={idx}>{option}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => setEditingQuestion(question)}
                            className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(question.id)}
                            className="text-red-600 hover:text-red-500 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">❓</div>
                  <p className="text-gray-500 mb-2">
                    {selectedTerm === 'ALL' 
                      ? 'No questions found' 
                      : `No questions found for ${selectedTerm} term`
                    }
                  </p>
                  <p className="text-sm text-gray-400">Create your first question to get started</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </RoleGuard>
  )
}