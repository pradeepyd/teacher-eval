'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

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
  _onCancel: () => void
  loading?: boolean
}

export default function EvaluationForm({ term, onSubmit, _onCancel, loading = false }: EvaluationFormProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<{ [key: string]: string }>({})
  const [selfComment, setSelfComment] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [canEdit, setCanEdit] = useState(true)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [error, setError] = useState('')
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const latestPayloadRef = useRef<{ answers?: { questionId: string; answer: string }[]; selfComment?: string }>({})
  
  const totalQuestions = questions.length
  const answeredCount = questions.reduce((count, q) => {
    const value = answers[q.id]?.trim() || ''
    return count + (value.length > 0 ? 1 : 0)
  }, 0)
  const progressPercent = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0

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
        toast.error('Error fetching questions')
      } finally {
        setFetchLoading(false)
      }
    }

    fetchQuestions()
  }, [term])

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    }
  }, [])

  const triggerAutosave = (partial: { answers?: { questionId: string; answer: string }[]; selfComment?: string | undefined }) => {
    if (!canEdit) return
    latestPayloadRef.current = {
      answers: partial.answers,
      selfComment: partial.selfComment,
    }
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = setTimeout(async () => {
      try {
        setAutosaveStatus('saving')
        const body: Record<string, unknown> = { term }
        if (latestPayloadRef.current.answers) body.answers = latestPayloadRef.current.answers
        if (typeof latestPayloadRef.current.selfComment === 'string') body.selfComment = latestPayloadRef.current.selfComment
        if (body.answers || typeof body.selfComment === 'string') {
          const res = await fetch('/api/teacher-answers', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          })
          if (!res.ok) throw new Error('Autosave failed')
          setAutosaveStatus('saved')
          setTimeout(() => setAutosaveStatus('idle'), 1000)
        } else {
          setAutosaveStatus('idle')
        }
      } catch (e) {
        setAutosaveStatus('error')
      }
    }, 600)
  }

  const handleAnswerChange = (questionId: string, value: string) => {
    if (!canEdit) return
    
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }))

    triggerAutosave({ answers: [{ questionId, answer: value }], selfComment: undefined })
  }

  const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
    if (!canEdit) return

    // Detect if this checkbox question has special options that require textareas
    // We support two special labels: "Target" and "Actions to be Implemented".
    const question = questions.find(q => q.id === questionId)
    const hasSpecialTextareas = question?.options?.some(opt => /target/i.test(opt) || /actions to be implemented/i.test(opt))

    if (hasSpecialTextareas) {
      // For special checkbox with textareas, we store the answer as a JSON string
      // of shape: { selected: string[], details: Record<string,string> }
      let parsed: { selected: string[]; details: Record<string, string> } = { selected: [], details: {} }
      try {
        parsed = answers[questionId] ? JSON.parse(answers[questionId]) : parsed
        if (!Array.isArray(parsed.selected)) parsed.selected = []
        if (typeof parsed.details !== 'object' || parsed.details === null) parsed.details = {}
      } catch (_e) {
        // Fallback if previous value was comma-separated list
        const list = answers[questionId] ? answers[questionId].split(',').map(s => s.trim()).filter(Boolean) : []
        parsed = { selected: list, details: {} }
      }

      let nextSelected: string[]
      if (checked) {
        nextSelected = Array.from(new Set([...(parsed.selected || []), option]))
      } else {
        nextSelected = (parsed.selected || []).filter(v => v !== option)
      }

      const encoded = JSON.stringify({ selected: nextSelected, details: parsed.details || {} })
      setAnswers(prev => ({ ...prev, [questionId]: encoded }))
      triggerAutosave({ answers: [{ questionId, answer: encoded }], selfComment: undefined })
      return
    }

    // Default behavior for regular checkbox questions (comma-separated string)
    const currentAnswers = answers[questionId] ? answers[questionId].split(',').map(s => s.trim()).filter(s => s) : []
    let newAnswers: string[]
    if (checked) {
      newAnswers = [...currentAnswers, option]
    } else {
      newAnswers = currentAnswers.filter(answer => answer !== option)
    }
    setAnswers(prev => ({ ...prev, [questionId]: newAnswers.join(', ') }))
    triggerAutosave({ answers: [{ questionId, answer: newAnswers.join(', ') }], selfComment: undefined })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!canEdit) return

    // Validate all questions are answered
    const unansweredQuestions = questions.filter(q => !answers[q.id] || answers[q.id].trim() === '')
    if (unansweredQuestions.length > 0) {
      setError(`Please answer all questions. Missing: ${unansweredQuestions.length} questions`)
      toast.error('Please answer all questions before submitting')
      return
    }

    if (!selfComment.trim()) {
      setError('Self comment is required')
      toast.error('Self comment is required')
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
      <div className="text-sm text-gray-600">Failed to load the evaluation form.</div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white shadow-md rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{getTermTitle()}</h2>
              <p className="text-sm text-gray-600 mt-1">{getTermDescription()}</p>
            </div>
            <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${isSubmitted ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
              {isSubmitted ? 'Submitted' : 'Draft'}
            </span>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Progress</span>
              <span>{answeredCount} of {totalQuestions} completed</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
              <div className="h-2 bg-indigo-600" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Toasts replace banners for errors; keep minimal inline fallback removed */}

          <div className="space-y-8">
            {questions.map((question, index) => (
              <div key={question.id} className="pb-6">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-semibold">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-medium text-gray-900 mb-3">
                      {question.question}
                    </h3>

                    {question.type === 'TEXT' && (
                      <input
                        type="text"
                        value={answers[question.id] || ''}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        className="block w-full rounded-lg border border-gray-300 bg-white/90 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
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
                        className="block w-full rounded-lg border border-gray-300 bg-white/90 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
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
                              className="h-4 w-4 accent-indigo-600 focus:ring-indigo-500 border-gray-300"
                              disabled={!canEdit}
                              required
                            />
                            <span className="ml-3 text-sm text-gray-800">{option}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {question.type === 'CHECKBOX' && (
                      (() => {
                        const hasTarget = question.options.some(opt => /target/i.test(opt))
                        const hasActions = question.options.some(opt => /actions to be implemented/i.test(opt))
                        const showSpecial = hasTarget || hasActions

                        if (!showSpecial) {
                          // Default checkbox rendering
                          const currentAnswers = answers[question.id] ? answers[question.id].split(',').map(s => s.trim()) : []
                          return (
                            <div className="space-y-3">
                              {question.options.map((option, optIndex) => (
                                <label key={optIndex} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={currentAnswers.includes(option)}
                                    onChange={(e) => handleCheckboxChange(question.id, option, e.target.checked)}
                                    className="h-4 w-4 accent-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    disabled={!canEdit}
                                  />
                                  <span className="ml-3 text-sm text-gray-800">{option}</span>
                                </label>
                              ))}
                            </div>
                          )
                        }

                        // Special rendering: add textareas beneath specific options
                        let parsed: { selected: string[]; details: Record<string, string> } = { selected: [], details: {} }
                        try {
                          parsed = answers[question.id] ? JSON.parse(answers[question.id]) : parsed
                          if (!Array.isArray(parsed.selected)) parsed.selected = []
                          if (typeof parsed.details !== 'object' || parsed.details === null) parsed.details = {}
                        } catch (_e) {
                          const list = answers[question.id] ? answers[question.id].split(',').map(s => s.trim()).filter(Boolean) : []
                          parsed = { selected: list, details: {} }
                        }

                        const updateDetails = (label: string, value: string) => {
                          if (!canEdit) return
                          const next = {
                            selected: Array.from(new Set([...(parsed.selected || []), label])),
                            details: { ...(parsed.details || {}), [label]: value }
                          }
                          const encoded = JSON.stringify(next)
                          setAnswers(prev => ({ ...prev, [question.id]: encoded }))
                          triggerAutosave({ answers: [{ questionId: question.id, answer: encoded }], selfComment: undefined })
                        }

                        const isChecked = (label: string) => (parsed.selected || []).includes(label)

                        return (
                          <div className="space-y-4">
                            {question.options.map((option, optIndex) => (
                              <div key={optIndex}>
                                <label className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={isChecked(option)}
                                    onChange={(e) => handleCheckboxChange(question.id, option, e.target.checked)}
                                    className="h-4 w-4 accent-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    disabled={!canEdit}
                                  />
                                  <span className="ml-3 text-sm text-gray-800">{option}</span>
                                </label>

                                {( /target/i.test(option) || /actions to be implemented/i.test(option) ) && (
                                  <div className="mt-2 ml-7">
                                    <textarea
                                      value={(parsed.details && parsed.details[option]) || ''}
                                      onChange={(e) => updateDetails(option, e.target.value)}
                                      rows={3}
                                      className="block w-full rounded-lg border border-gray-300 bg-white/90 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
                                      placeholder={/target/i.test(option) ? 'Enter your target...' : 'Describe actions to be implemented...'}
                                      disabled={!canEdit}
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )
                      })()
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Self Comment Section */}
            <div className="bg-indigo-50/60 rounded-xl p-6 border border-indigo-100">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Self-Assessment Comment
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Please provide additional comments about your {term.toLowerCase()} of year evaluation:
              </p>
              <textarea
                value={selfComment}
                onChange={(e) => {
                  setSelfComment(e.target.value)
                  triggerAutosave({ answers: undefined, selfComment: e.target.value })
                }}
                rows={6}
                className="block w-full rounded-lg border border-indigo-200 bg-white/90 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
                placeholder="Share your thoughts, challenges, achievements, and goals..."
                disabled={!canEdit}
                required
              />
              <div className="mt-2 text-xs text-gray-500 h-4">
                {autosaveStatus === 'saving' && 'Saving...'}
                {autosaveStatus === 'saved' && 'Saved'}
                {autosaveStatus === 'error' && 'Auto-save failed'}
              </div>
            </div>
          </div>

          {canEdit && (
            <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
              <div className="flex items-center text-xs text-gray-500 mr-auto sm:mr-0">
                Last saved: {autosaveStatus === 'saving' ? 'saving...' : 'a moment ago'}
              </div>
              <button
                type="button"
                onClick={() => triggerAutosave({ answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })), selfComment })}
                className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border-0"
              >
                Save Draft
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Evaluation'}
              </button>
            </div>
          )}

          {isSubmitted && (
            <div className="mt-8 pt-6 border-t border-gray-200 text-sm text-green-700">Submitted.</div>
          )}
        </form>
      </div>
    </div>
  )
}

function debounce(fn: () => void, delay: number) {
  let t: NodeJS.Timeout
  return () => {
    clearTimeout(t)
    t = setTimeout(fn, delay)
  }
}
