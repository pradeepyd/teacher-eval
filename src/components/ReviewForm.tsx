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
    scores: {
      questionScores: { [key: string]: number }
      rubric: Record<string, number>
      professionalismSubtotal: number
      responsibilitiesSubtotal: number
      developmentSubtotal: number
      totalScore: number
    }
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
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({})
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
            setScores(data.existingReview.scores?.questionScores || {})
            setRubricScores(data.existingReview.scores?.rubric || {})
          } else {
            // Initialize scores with 0 for each question
            const initialScores: { [key: string]: number } = {}
            data.answers.forEach((answer: TeacherAnswer) => {
              initialScores[answer.question.id] = 0
            })
            setScores(initialScores)
            setRubricScores({})
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

    // Compute rubric subtotals and total per evaluation.md
    const professionalismKeys = Object.keys(rubricScores).filter(k => k.startsWith('[Professionalism]'))
    const responsibilitiesKeys = Object.keys(rubricScores).filter(k => k.startsWith('[Responsibilities]'))
    const developmentKeys = Object.keys(rubricScores).filter(k => k.startsWith('[Development]'))

    const sum = (keys: string[]) => keys.reduce((acc, k) => acc + (rubricScores[k] || 0), 0)
    const professionalismSubtotal = sum(professionalismKeys) * 2 // (X2) weighting
    const responsibilitiesSubtotal = sum(responsibilitiesKeys)
    const developmentSubtotal = sum(developmentKeys)
    const rubricTotal = professionalismSubtotal + responsibilitiesSubtotal + developmentSubtotal

    onSubmit({
      comments: comments.trim(),
      scores: {
        questionScores: scores,
        rubric: rubricScores,
        professionalismSubtotal,
        responsibilitiesSubtotal,
        developmentSubtotal,
        totalScore: rubricTotal,
      },
      submitted
    })
  }

  const getTotalScore = () => {
    // Prefer rubric total if present
    const professionalism = Object.keys(rubricScores).filter(k => k.startsWith('[Professionalism]'))
    const responsibilities = Object.keys(rubricScores).filter(k => k.startsWith('[Responsibilities]'))
    const development = Object.keys(rubricScores).filter(k => k.startsWith('[Development]'))
    if (professionalism.length + responsibilities.length + development.length > 0) {
      const sum = (keys: string[]) => keys.reduce((acc, k) => acc + (rubricScores[k] || 0), 0)
      return sum(professionalism) * 2 + sum(responsibilities) + sum(development)
    }
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

              {/* Rubric (evaluation.md mapped) */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Rubric (1–5 per item)</h4>
                <div className="space-y-4">
                  {/* Professionalism */}
                  <div>
                    <div className="text-sm font-semibold text-gray-800 mb-2">Professionalism (x2)</div>
                    {['Compliance','Punctuality/Attendance','Ability to deal with students','Competence and Performance'].map((label) => {
                      const key = `[Professionalism] ${label}`
                      return (
                        <div key={key} className="flex items-center justify-between py-1">
                          <span className="text-sm text-gray-700">{label}</span>
                          <div className="flex items-center gap-2">
                            {[1,2,3,4,5].map(n => (
                              <button
                                type="button"
                                key={n}
                                onClick={() => teacherData?.canEdit && setRubricScores(prev => ({ ...prev, [key]: n }))}
                                className={`w-8 h-8 rounded-md text-sm border ${rubricScores[key]===n ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                                disabled={!teacherData?.canEdit}
                              >{n}</button>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Responsibilities */}
                  <div>
                    <div className="text-sm font-semibold text-gray-800 mb-2">College Responsibilities</div>
                    {['Attending Non-Teaching Activities','Department Related Duties','Collegial Relationship','Ability to Deal with Supervisors','Participation in College Committees'].map((label) => {
                      const key = `[Responsibilities] ${label}`
                      return (
                        <div key={key} className="flex items-center justify-between py-1">
                          <span className="text-sm text-gray-700">{label}</span>
                          <div className="flex items-center gap-2">
                            {[1,2,3,4,5].map(n => (
                              <button
                                type="button"
                                key={n}
                                onClick={() => teacherData?.canEdit && setRubricScores(prev => ({ ...prev, [key]: n }))}
                                className={`w-8 h-8 rounded-md text-sm border ${rubricScores[key]===n ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                                disabled={!teacherData?.canEdit}
                              >{n}</button>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Development */}
                  <div>
                    <div className="text-sm font-semibold text-gray-800 mb-2">Professional Development</div>
                    {['In-Service Training','Research and Publications','National and International Conferences'].map((label) => {
                      const key = `[Development] ${label}`
                      return (
                        <div key={key} className="flex items-center justify-between py-1">
                          <span className="text-sm text-gray-700">{label}</span>
                          <div className="flex items-center gap-2">
                            {[1,2,3,4,5].map(n => (
                              <button
                                type="button"
                                key={n}
                                onClick={() => teacherData?.canEdit && setRubricScores(prev => ({ ...prev, [key]: n }))}
                                className={`w-8 h-8 rounded-md text-sm border ${rubricScores[key]===n ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                                disabled={!teacherData?.canEdit}
                              >{n}</button>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
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
                    HOD Total Score: {(teacherData.hodReview.scores?.totalScore as number) ?? 0}
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
                    className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border-0"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmit(false)}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border-0 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmit(true)}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
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