'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface Question {
  id: string
  question: string
  type: 'TEXT' | 'TEXTAREA' | 'MCQ' | 'CHECKBOX'
  options: string[]
  order: number
}

interface TeacherAnswer {
  id: string
  questionId: string
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
    id: string
    finalComment: string
    finalScore: number
    status: 'PROMOTED' | 'ON_HOLD' | 'NEEDS_IMPROVEMENT'
    submitted: boolean
  }
  scoringSummary: {
    hodTotalScore: number
    asstTotalScore: number
    maxPossibleScore: number
    averageScore: number
    questionsCount: number
  }
  canEdit: boolean
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
        if (!response.ok) {
          throw new Error('Failed to fetch teacher data')
        }
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
      } catch (error) {
        setError('Failed to load teacher data')
        toast.error('Failed to load teacher data')
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
      toast.error('Final comment is required')
      return
    }

    if (finalScore < 0) {
      setError('Final score cannot be negative')
      toast.error('Final score cannot be negative')
      return
    }

    onSubmit({
      finalComment: finalComment.trim(),
      finalScore,
      status,
      submitted
    })
  }

  // const getStatusColor = (statusValue: string) => {
  //   switch (statusValue) {
  //     case 'PROMOTED': return 'text-green-800 bg-green-100'
  //     case 'ON_HOLD': return 'text-yellow-800 bg-yellow-100'
  //     case 'NEEDS_IMPROVEMENT': return 'text-red-800 bg-red-100'
  //     default: return 'text-gray-800 bg-gray-100'
  //   }
  // }

  // const getStatusLabel = (statusValue: string) => {
  //   switch (statusValue) {
  //     case 'PROMOTED': return 'Promoted'
  //     case 'ON_HOLD': return 'On Hold'
  //     case 'NEEDS_IMPROVEMENT': return 'Needs Improvement'
  //     default: return statusValue
  //     }
  // }

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error && !teacherData) {
    return (
      <div className="text-sm text-gray-600">Failed to load teacher data.</div>
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
    <div className="max-w-6xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
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

              {/* HOD Review */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  HOD Review
                </h4>
                <div className="bg-green-50 rounded p-3">
                  <p className="text-green-800">{teacherData.hodReview.comments}</p>
                  <p className="text-sm text-green-700 mt-2">
                    Score: {teacherData.hodReview.totalScore}%
                  </p>
                </div>
              </div>

              {/* Assistant Dean Review */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Assistant Dean Review
                </h4>
                <div className="bg-purple-50 rounded p-3">
                  <p className="text-purple-800">{teacherData.asstReview.comments}</p>
                  <p className="text-sm text-purple-700 mt-2">
                    Score: {teacherData.asstReview.totalScore}%
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column - Final Review Form */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Final Review</h3>
                <div className="text-sm text-gray-600">
                  Average Score: <span className="font-semibold">{teacherData.scoringSummary.averageScore}%</span>
                </div>
              </div>

              {/* Scoring Overview */}
              <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
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

              {/* Final Score */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Final Score</h4>
                <div className="flex items-center gap-4">
                  <label htmlFor="finalScore" className="block text-sm font-medium text-gray-700">
                    Final Score (0-100%):
                  </label>
                  <Input
                    id="finalScore"
                    type="number"
                    min="0"
                    max="100"
                    value={finalScore}
                    onChange={(e) => setFinalScore(parseInt(e.target.value) || 0)}
                    className="w-24"
                    disabled={!teacherData.canEdit}
                  />
                  <span className="text-sm text-gray-500">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Enter the final score based on all evaluations and your assessment
                </p>
              </div>

              {/* Status */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Promotion Status</h4>
                <Select
                  value={status}
                  onValueChange={(value: 'PROMOTED' | 'ON_HOLD' | 'NEEDS_IMPROVEMENT') => setStatus(value)}
                  disabled={!teacherData.canEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROMOTED">Promoted</SelectItem>
                    <SelectItem value="ON_HOLD">On Hold</SelectItem>
                    <SelectItem value="NEEDS_IMPROVEMENT">Needs Improvement</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-2">
                  Select the appropriate promotion status based on the evaluation
                </p>
              </div>

              {/* Final Comment */}
              <div>
                <label htmlFor="finalComment" className="block text-sm font-medium text-gray-700 mb-2">
                  Final Comments
                </label>
                <Textarea
                  id="finalComment"
                  value={finalComment}
                  onChange={(e) => setFinalComment(e.target.value)}
                  rows={6}
                  className="w-full"
                  placeholder="Provide your final assessment and recommendations..."
                  disabled={!teacherData.canEdit}
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  Include your final assessment, recommendations, and any additional comments
                </p>
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
                    {loading ? 'Submitting...' : 'Submit Final Review'}
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
                        Final Review Submitted
                      </h3>
                      <p className="text-sm text-green-700 mt-1">
                        Your final review has been successfully submitted and is now part of the evaluation process.
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