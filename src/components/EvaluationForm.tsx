'use client'

import { useState, useEffect } from 'react'

interface Question {
  id: string
  question: string
  type: 'TEXT' | 'TEXTAREA' | 'MCQ' | 'CHECKBOX'
  options: string[]
  order: number
  existingAnswer: string
}

interface EvaluationFormProps {
  term: 'START' | 'END'
  onSubmit: (answers: { questionId: string; answer: string }[], selfComment: string) => void
  onCancel: () => void
  loading?: boolean
}

export default function EvaluationForm({ term, onSubmit, onCancel, loading = false }: EvaluationFormProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<{ [key: string]: string }>({})
  const [selfComment, setSelfComment] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [canEdit, setCanEdit] = useState(true)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch(`/api/teacher-evaluation/questions?term=${term}`)
        if (response.ok) {
          const data = await response.json()
          setQuestions(data.questions)
          setSelfComment(data.existingSelfComment)
          setIsSubmitted(data.isSubmitted)
          setCanEdit(data.canEdit)
          
          // Initialize answers with existing data
          const initialAnswers: { [key: string]: string } = {}
          data.questions.forEach((q: Question) => {
            initialAnswers[q.id] = q.existingAnswer
          })
          setAnswers(initialAnswers)
        } else {
          setError('Failed to fetch questions')
        }
      } catch (error) {
        setError('Error fetching questions')
      } finally {
        setFetchLoading(false)
      }
    }

    fetchQuestions()
  }, [term])

  const handleAnswerChange = (questionId: string, value: string) => {
    if (!canEdit) return
    
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
    if (!canEdit) return

    const currentAnswers = answers[questionId] ? answers[questionId].split(',').map(s => s.trim()).filter(s => s) : []
    
    let newAnswers: string[]
    if (checked) {
      newAnswers = [...currentAnswers, option]
    } else {
      newAnswers = currentAnswers.filter(answer => answer !== option)
    }
    
    setAnswers(prev => ({
      ...prev,
      [questionId]: newAnswers.join(', ')
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!canEdit) return

    // Validate all questions are answered
    const unansweredQuestions = questions.filter(q => !answers[q.id] || answers[q.id].trim() === '')
    if (unansweredQuestions.length > 0) {
      setError(`Please answer all questions. Missing: ${unansweredQuestions.length} questions`)
      return
    }

    if (!selfComment.trim()) {
      setError('Self comment is required')
      return
    }

    const formattedAnswers = questions.map(q => ({
      questionId: q.id,
      answer: answers[q.id]
    }))

    onSubmit(formattedAnswers, selfComment)
  }

  const getTermTitle = () => {
    switch (term) {
      case 'START': return 'Start of Year Evaluation'
      case 'END': return 'End of Year Evaluation'
      default: return 'Evaluation'
    }
  }

  const getTermDescription = () => {
    switch (term) {
      case 'START': return 'Set your goals and expectations for the academic year'
      case 'END': return 'Reflect on your progress and achievements this year'
      default: return 'Complete your evaluation'
    }
  }

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error && questions.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{getTermTitle()}</h2>
          <p className="text-sm text-gray-600 mt-1">{getTermDescription()}</p>
          {isSubmitted && (
            <div className="mt-2">
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                Submitted
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-8">
            {questions.map((question, index) => (
              <div key={question.id} className="border-b border-gray-200 pb-6">
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      {question.question}
                    </h3>

                    {question.type === 'TEXT' && (
                      <input
                        type="text"
                        value={answers[question.id] || ''}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="Enter your answer..."
                        disabled={!canEdit}
                        required
                      />
                    )}

                    {question.type === 'TEXTAREA' && (
                      <textarea
                        value={answers[question.id] || ''}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        rows={4}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="Enter your detailed answer..."
                        disabled={!canEdit}
                        required
                      />
                    )}

                    {question.type === 'MCQ' && (
                      <div className="space-y-3">
                        {question.options.map((option, optIndex) => (
                          <label key={optIndex} className="flex items-center">
                            <input
                              type="radio"
                              name={`question_${question.id}`}
                              value={option}
                              checked={answers[question.id] === option}
                              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                              disabled={!canEdit}
                              required
                            />
                            <span className="ml-3 text-sm text-gray-700">{option}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {question.type === 'CHECKBOX' && (
                      <div className="space-y-3">
                        {question.options.map((option, optIndex) => {
                          const currentAnswers = answers[question.id] ? answers[question.id].split(',').map(s => s.trim()) : []
                          return (
                            <label key={optIndex} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={currentAnswers.includes(option)}
                                onChange={(e) => handleCheckboxChange(question.id, option, e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                disabled={!canEdit}
                              />
                              <span className="ml-3 text-sm text-gray-700">{option}</span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Self Comment Section */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Self-Assessment Comment
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Please provide additional comments about your {term.toLowerCase()} of year evaluation:
              </p>
              <textarea
                value={selfComment}
                onChange={(e) => setSelfComment(e.target.value)}
                rows={6}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Share your thoughts, challenges, achievements, and goals..."
                disabled={!canEdit}
                required
              />
            </div>
          </div>

          {canEdit && (
            <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Evaluation'}
              </button>
            </div>
          )}

          {isSubmitted && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-green-400 text-xl">✓</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Evaluation Submitted
                    </h3>
                    <p className="text-sm text-green-700 mt-1">
                      Your {term.toLowerCase()} of year evaluation has been successfully submitted and is now under review.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}