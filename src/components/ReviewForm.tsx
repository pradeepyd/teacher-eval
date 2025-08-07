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
  hodReview?: {
    comments: string
    scores: any
    reviewer: {
      name: string
    }
  }
  existingReview?: {
    comments: string
    scores: any
    submitted: boolean
  }
  canEdit: boolean
}

interface ReviewFormProps {
  teacherId: string
  term: 'START' | 'END'
  reviewerRole: 'HOD' | 'ASST_DEAN'
  onSubmit: (data: {
    comments: string
    scores: { [key: string]: number }
    submitted: boolean
  }) => void
  onCancel: () => void
  loading?: boolean
}

export default function ReviewForm({ 
  teacherId, 
  term, 
  reviewerRole,
  onSubmit, 
  onCancel, 
  loading = false 
}: ReviewFormProps) {
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null)
  const [comments, setComments] = useState('')
  const [scores, setScores] = useState<{ [key: string]: number }>({})
  const [fetchLoading, setFetchLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        const endpoint = reviewerRole === 'HOD' 
          ? '/api/reviews/hod/teacher-data'
          : '/api/reviews/asst-dean/teacher-data'
        
        const response = await fetch(`${endpoint}?teacherId=${teacherId}&term=${term}`)
        
        if (response.ok) {
          const data = await response.json()
          setTeacherData(data)
          
          // Initialize form with existing data
          if (data.existingReview) {
            setComments(data.existingReview.comments)
            setScores(data.existingReview.scores || {})
          } else {
            // Initialize scores with 0 for each question
            const initialScores: { [key: string]: number } = {}
            data.answers.forEach((answer: TeacherAnswer) => {
              initialScores[answer.question.id] = 0
            })
            setScores(initialScores)
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
  }, [teacherId, term, reviewerRole])

  const handleScoreChange = (questionId: string, score: number) => {
    if (!teacherData?.canEdit) return
    
    setScores(prev => ({
      ...prev,
      [questionId]: score
    }))
  }

  const handleSubmit = (submitted: boolean = false) => {
    if (!teacherData?.canEdit && !submitted) return

    // Validate scores
    const unansweredQuestions = teacherData?.answers.filter(answer => 
      scores[answer.question.id] === undefined || scores[answer.question.id] < 0
    ) || []

    if (unansweredQuestions.length > 0) {
      setError('Please provide scores for all questions')
      return
    }

    if (!comments.trim()) {
      setError('Comments are required')
      return
    }

    onSubmit({
      comments: comments.trim(),
      scores,
      submitted
    })
  }

  const getTotalScore = () => {
    return Object.values(scores).reduce((sum, score) => sum + score, 0)
  }

  const getMaxScore = () => {
    return (teacherData?.answers.length || 0) * 10 // Assuming max 10 points per question
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

  const isSubmitted = teacherData.existingReview?.submitted || false

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {reviewerRole === 'HOD' ? 'HOD Review' : 'Assistant Dean Review'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {teacherData.teacher.name} - {teacherData.teacher.department.name} - {term} Term
              </p>
            </div>
            {isSubmitted && (
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                Submitted
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Teacher's Responses */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Teacher's Responses</h3>
              
              {/* Teacher Answers */}
              <div className="space-y-6">
                {teacherData.answers.map((answer, index) => (
                  <div key={answer.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-900">
                        Question {index + 1}
                      </h4>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {answer.question.type}
                      </span>
                    </div>
                    
                    <p className="text-gray-700 mb-3">{answer.question.question}</p>
                    
                    <div className="bg-blue-50 rounded p-3">
                      <p className="text-sm text-blue-900 font-medium mb-1">Teacher's Answer:</p>
                      <p className="text-blue-800">{answer.answer}</p>
                    </div>

                    {/* Score Input */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Score (0-10 points)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={scores[answer.question.id] || 0}
                        onChange={(e) => handleScoreChange(answer.question.id, parseInt(e.target.value) || 0)}
                        className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        disabled={!teacherData.canEdit}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Self Comment */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Teacher's Self-Assessment Comment
                </h4>
                <div className="bg-blue-50 rounded p-3">
                  <p className="text-blue-800">{teacherData.selfComment}</p>
                </div>
              </div>
            </div>

            {/* Right Column - Review Form */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Your Review</h3>
                <div className="text-sm text-gray-600">
                  Total Score: <span className="font-semibold">{getTotalScore()}/{getMaxScore()}</span>
                </div>
              </div>

              {/* HOD Review (for Assistant Dean) */}
              {reviewerRole === 'ASST_DEAN' && teacherData.hodReview && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    HOD Review by {teacherData.hodReview.reviewer.name}
                  </h4>
                  <p className="text-gray-700 mb-2">{teacherData.hodReview.comments}</p>
                  <div className="text-sm text-gray-600">
                    HOD Total Score: {Object.values(teacherData.hodReview.scores || {}).reduce((sum: number, score: any) => sum + score, 0)}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div>
                <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-2">
                  Review Comments
                </label>
                <textarea
                  id="comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={8}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder={`Provide your ${reviewerRole === 'HOD' ? 'HOD' : 'Assistant Dean'} review comments...`}
                  disabled={!teacherData.canEdit}
                  required
                />
              </div>

              {/* Action Buttons */}
              {teacherData.canEdit && (
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmit(false)}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmit(true)}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? 'Submitting...' : 'Submit Review'}
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
                        Review Submitted
                      </h3>
                      <p className="text-sm text-green-700 mt-1">
                        Your review has been successfully submitted and is now part of the evaluation process.
                      </p>
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