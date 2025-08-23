'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { useReviewData } from '@/hooks/useReviewData'

interface TeacherAnswer {
  id: string
  questionId: string
  answer: string
  question: {
    id: string
    type: string
    question: string
    options?: string[]
  }
}

interface TeacherData {
  teacher: {
    id: string
    name: string
    email: string
    department: string
  }
  answers: TeacherAnswer[]
  existingReview?: {
    id: string
    comments: string
    scores: {
      questionScores: Record<string, number>
      rubric: Record<string, number>
      overallRating: number
    }
    submitted: boolean
  } | null
  canEdit: boolean
}

interface ReviewFormProps {
  teacherId: string
  term: 'START' | 'END'
  reviewerRole: 'HOD' | 'ASST_DEAN'
  onSubmit: (data: {
    comments: string
    scores: {
      questionScores: Record<string, number>
      rubric: Record<string, number>
      professionalismSubtotal: number
      responsibilitiesSubtotal: number
      developmentSubtotal: number
      totalScore: number
    }
    overallRating: number
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
  const { fetchTeacherData, submitReview } = useReviewData()
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null)
  const [comments, setComments] = useState('')
  const [scores, setScores] = useState<{ [key: string]: number }>({})
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({})
  const [overallRating, setOverallRating] = useState<number>(0)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchTeacherDataAsync = async () => {
      try {
        const data = await fetchTeacherData(teacherId, term, reviewerRole)
        setTeacherData(data)
        
        // Initialize form with existing data
        if (data.existingReview) {
          setComments(data.existingReview.comments)
          setScores(data.existingReview.scores?.questionScores || {})
          setRubricScores(data.existingReview.scores?.rubric || {})
          setOverallRating(data.existingReview.scores?.overallRating || 0)
        } else {
          // Initialize scores with 0 for each question
          const initialScores: { [key: string]: number } = {}
          data.answers.forEach((answer: TeacherAnswer) => {
            initialScores[answer.question.id] = 0
          })
          setScores(initialScores)
          setRubricScores({})
        }
      } catch (error) {
        setError('Error fetching teacher data')
      } finally {
        setFetchLoading(false)
      }
    }

    fetchTeacherDataAsync()
  }, [teacherId, term, reviewerRole, fetchTeacherData])

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

    const reviewData = {
      comments: comments.trim(),
      scores: {
        questionScores: scores,
        rubric: rubricScores,
        professionalismSubtotal,
        responsibilitiesSubtotal,
        developmentSubtotal,
        totalScore: rubricTotal,
      },
      overallRating,
      submitted
    }

    // Transform data to match the expected interface
    const transformedData = {
      teacherId,
      comment: reviewData.comments,
      score: reviewData.overallRating,
      term
    }
    
    // Use the hook's submitReview function
    submitReview(transformedData, reviewerRole)
      .then(() => {
        onSubmit(reviewData)
      })
      .catch((error) => {
        setError(error instanceof Error ? error.message : 'Failed to submit review')
        toast.error('Failed to submit review')
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
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-semibold text-gray-900">
                  {reviewerRole === 'HOD' ? 'HOD Review' : 'Assistant Dean Review'}
                </h2>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  term === 'START' 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {term === 'START' ? 'START Term' : 'END Term'}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {teacherData.teacher.name} - {teacherData.teacher.department}
              </p>
            </div>
            {isSubmitted && (
              <Badge className="bg-green-100 text-green-800">
                Submitted
              </Badge>
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
                      <div className="text-blue-800">
                        {(() => {
                          try {
                            const parsed = typeof answer.answer === 'string' ? JSON.parse(answer.answer) : null
                            if (parsed && parsed.details && typeof parsed.details === 'object') {
                              const entries = Object.entries(parsed.details as Record<string,string>).filter(([,v]) => (v||'').trim().length > 0)
                              if (entries.length > 0) {
                                return (
                                  <div className="space-y-1">
                                    {entries.map(([label, value]) => (
                                      <div key={label}><span className="font-semibold">{label}:</span> {value}</div>
                                    ))}
                                  </div>
                                )
                              }
                            }
                          } catch {}
                          return <span>{String(answer.answer)}</span>
                        })()}
                      </div>
                    </div>

                    {/* Score Input */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Score (0-10 points)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={scores[answer.question.id] || 0}
                        onChange={(e) => handleScoreChange(answer.question.id, parseInt(e.target.value) || 0)}
                        className="w-20"
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
                  <p className="text-blue-800">
                    {teacherData.answers.find(a => a.question.type === 'TEXTAREA' && a.question.question.includes('comment'))?.answer || 'No self-comment provided'}
                  </p>
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

              {/* Overall Rating */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Overall Performance Rating</h4>
                <div className="flex items-center gap-4">
                  <label htmlFor="overallRating" className="block text-sm font-medium text-gray-700">
                    Overall Rating (1-10 points):
                  </label>
                  <Input
                    id="overallRating"
                    type="number"
                    min="1"
                    max="10"
                    value={overallRating}
                    onChange={(e) => setOverallRating(parseInt(e.target.value) || 0)}
                    className="w-20"
                    disabled={!teacherData.canEdit}
                  />
                  <span className="text-sm text-gray-500">/ 10</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Rate the teacher's overall performance based on their answers and rubric scores
                </p>
              </div>

              {/* Comments */}
              <div>
                <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-2">
                  Review Comments
                </label>
                <Textarea
                  id="comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={8}
                  placeholder={`Provide your ${reviewerRole === 'HOD' ? 'HOD' : 'Assistant Dean'} review comments...`}
                  disabled={!teacherData.canEdit}
                  required
                />
              </div>

              {/* Action Buttons */}
              {teacherData.canEdit && (
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={onCancel}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleSubmit(false)}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Draft'}
                  </Button>
                  <Button
                    onClick={() => handleSubmit(true)}
                    disabled={loading}
                  >
                    {loading ? 'Submitting...' : 'Submit Review'}
                  </Button>
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