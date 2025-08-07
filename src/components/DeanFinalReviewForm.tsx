'use client'

import { useState, useEffect } from 'react'

interface Question {
  id: string
  question: string
  type: 'TEXT' | 'TEXTAREA' | 'MCQ' | 'CHECKBOX'
  options: string[]
  order: number
}

interface TeacherAnswer {
  id: string
  answer: string
  question: Question
}

interface Review {
  comments: string
  scores: any
  totalScore: number
  reviewer: {
    name: string
  }
}

interface TeacherData {
  teacher: {
    id: string
    name: string
    email: string
    department: {
      name: string
    }
  }
  answers: TeacherAnswer[]
  selfComment: string
  hodReview: Review
  asstReview: Review
  existingFinalReview?: {
    finalComment: string
    finalScore: number
    status: 'PROMOTED' | 'ON_HOLD' | 'NEEDS_IMPROVEMENT'
    submitted: boolean
  }
  canEdit: boolean
  scoringSummary: {
    hodTotalScore: number
    asstTotalScore: number
    maxPossibleScore: number
    averageScore: number
    questionsCount: number
  }
}

interface DeanFinalReviewFormProps {
  teacherId: string
  term: 'START' | 'END'
  onSubmit: (data: {
    finalComment: string
    finalScore: number
    status: 'PROMOTED' | 'ON_HOLD' | 'NEEDS_IMPROVEMENT'
    submitted: boolean
  }) => void
  onCancel: () => void
  loading?: boolean
}

export default function DeanFinalReviewForm({ 
  teacherId, 
  term, 
  onSubmit, 
  onCancel, 
  loading = false 
}: DeanFinalReviewFormProps) {
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null)
  const [finalComment, setFinalComment] = useState('')
  const [finalScore, setFinalScore] = useState(0)
  const [status, setStatus] = useState<'PROMOTED' | 'ON_HOLD' | 'NEEDS_IMPROVEMENT'>('PROMOTED')
  const [fetchLoading, setFetchLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        const response = await fetch(`/api/reviews/dean/teacher-data?teacherId=${teacherId}&term=${term}`)
        
        if (response.ok) {
          const data = await response.json()
          setTeacherData(data)
          
          // Initialize form with existing data
          if (data.existingFinalReview) {
            setFinalComment(data.existingFinalReview.finalComment)
            setFinalScore(data.existingFinalReview.finalScore)
            setStatus(data.existingFinalReview.status)
          } else {
            // Initialize with average score as starting point
            setFinalScore(data.scoringSummary.averageScore)
          }
        } else {
          const errorData = await response.json()
          setError(errorData.error || 'Failed to fetch teacher data')
        }
      } catch (error) {
        setError('Error fetching teacher data')
      } finally {
        setFetchLoading(false)
      }
    }

    fetchTeacherData()
  }, [teacherId, term])

  const handleSubmit = (submitted: boolean = false) => {
    if (!teacherData?.canEdit && !submitted) return

    if (!finalComment.trim()) {
      setError('Final comment is required')
      return
    }

    if (finalScore < 0) {
      setError('Final score cannot be negative')
      return
    }

    onSubmit({
      finalComment: finalComment.trim(),
      finalScore,
      status,
      submitted
    })
  }

  const getStatusColor = (statusValue: string) => {
    switch (statusValue) {
      case 'PROMOTED': return 'text-green-800 bg-green-100'
      case 'ON_HOLD': return 'text-yellow-800 bg-yellow-100'
      case 'NEEDS_IMPROVEMENT': return 'text-red-800 bg-red-100'
      default: return 'text-gray-800 bg-gray-100'
    }
  }

  const getStatusLabel = (statusValue: string) => {
    switch (statusValue) {
      case 'PROMOTED': return 'Promoted'
      case 'ON_HOLD': return 'On Hold'
      case 'NEEDS_IMPROVEMENT': return 'Needs Improvement'
      default: return statusValue
    }
  }

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error && !teacherData) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    )
  }

  if (!teacherData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No data available</p>
      </div>
    )
  }

  const isSubmitted = teacherData.existingFinalReview?.submitted || false

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Dean Final Review
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {teacherData.teacher.name} - {teacherData.teacher.department.name} - {term} Term
              </p>
            </div>
            {isSubmitted && (
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                Final Decision Made
              </span>
            )}
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Evaluation Summary */}
            <div className="lg:col-span-2 space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Evaluation Summary</h3>
              
              {/* Scoring Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="text-md font-medium text-blue-900 mb-4">Scoring Overview</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-800">{teacherData.scoringSummary.hodTotalScore}</div>
                    <div className="text-sm text-blue-600">HOD Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-800">{teacherData.scoringSummary.asstTotalScore}</div>
                    <div className="text-sm text-blue-600">Asst Dean Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-800">{teacherData.scoringSummary.averageScore}</div>
                    <div className="text-sm text-blue-600">Average Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-800">{teacherData.scoringSummary.maxPossibleScore}</div>
                    <div className="text-sm text-blue-600">Max Possible</div>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <div className="text-sm text-blue-700">
                    Performance: {Math.round((teacherData.scoringSummary.averageScore / teacherData.scoringSummary.maxPossibleScore) * 100)}%
                  </div>
                </div>
              </div>

              {/* Teacher's Self Comment */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Teacher's Self-Assessment
                </h4>
                <div className="bg-blue-50 rounded p-3">
                  <p className="text-blue-800">{teacherData.selfComment}</p>
                </div>
              </div>

              {/* HOD Review */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  HOD Review by {teacherData.hodReview.reviewer.name}
                </h4>
                <div className="bg-green-50 rounded p-3">
                  <p className="text-green-800 mb-2">{teacherData.hodReview.comments}</p>
                  <div className="text-sm text-green-700 font-medium">
                    Total Score: {teacherData.hodReview.totalScore}/{teacherData.scoringSummary.maxPossibleScore}
                  </div>
                </div>
              </div>

              {/* Assistant Dean Review */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Assistant Dean Review by {teacherData.asstReview.reviewer.name}
                </h4>
                <div className="bg-purple-50 rounded p-3">
                  <p className="text-purple-800 mb-2">{teacherData.asstReview.comments}</p>
                  <div className="text-sm text-purple-700 font-medium">
                    Total Score: {teacherData.asstReview.totalScore}/{teacherData.scoringSummary.maxPossibleScore}
                  </div>
                </div>
              </div>

              {/* Teacher Answers (Collapsed by default) */}
              <details className="border border-gray-200 rounded-lg">
                <summary className="cursor-pointer p-4 font-medium text-gray-900 hover:bg-gray-50">
                  View Teacher's Detailed Responses ({teacherData.answers.length} questions)
                </summary>
                <div className="border-t border-gray-200 p-4 space-y-4">
                  {teacherData.answers.map((answer, index) => (
                    <div key={answer.id} className="border-l-4 border-blue-200 pl-4">
                      <h5 className="text-sm font-medium text-gray-900 mb-1">
                        Q{index + 1}: {answer.question.question}
                      </h5>
                      <p className="text-sm text-gray-700">{answer.answer}</p>
                    </div>
                  ))}
                </div>
              </details>
            </div>

            {/* Right Column - Final Review Form */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Final Decision</h3>

              {/* Final Score */}
              <div>
                <label htmlFor="finalScore" className="block text-sm font-medium text-gray-700 mb-2">
                  Final Score
                </label>
                <input
                  type="number"
                  id="finalScore"
                  value={finalScore}
                  onChange={(e) => setFinalScore(parseInt(e.target.value) || 0)}
                  min="0"
                  max={teacherData.scoringSummary.maxPossibleScore}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  disabled={!teacherData.canEdit}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Recommended: {teacherData.scoringSummary.averageScore} (based on average)
                </p>
              </div>

              {/* Status Decision */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                  Final Decision
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  disabled={!teacherData.canEdit}
                  required
                >
                  <option value="PROMOTED">Promoted</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="NEEDS_IMPROVEMENT">Needs Improvement</option>
                </select>
                <div className="mt-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)}`}>
                    {getStatusLabel(status)}
                  </span>
                </div>
              </div>

              {/* Final Comments */}
              <div>
                <label htmlFor="finalComment" className="block text-sm font-medium text-gray-700 mb-2">
                  Final Comments
                </label>
                <textarea
                  id="finalComment"
                  value={finalComment}
                  onChange={(e) => setFinalComment(e.target.value)}
                  rows={8}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Provide your final assessment and decision rationale..."
                  disabled={!teacherData.canEdit}
                  required
                />
              </div>

              {/* Action Buttons */}
              {teacherData.canEdit && (
                <div className="flex flex-col space-y-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => handleSubmit(false)}
                    disabled={loading}
                    className="w-full px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmit(true)}
                    disabled={loading}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    {loading ? 'Finalizing...' : 'Finalize Decision'}
                  </button>
                  <button
                    type="button"
                    onClick={onCancel}
                    className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {isSubmitted && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-green-400 text-xl">✓</span>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">
                        Final Decision Made
                      </h3>
                      <p className="text-sm text-green-700 mt-1">
                        The final evaluation decision has been submitted and is now immutable.
                      </p>
                      <div className="mt-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(teacherData.existingFinalReview?.status || 'PROMOTED')}`}>
                          {getStatusLabel(teacherData.existingFinalReview?.status || 'PROMOTED')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}