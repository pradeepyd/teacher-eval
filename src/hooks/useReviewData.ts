import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import type { ReviewSubmissionData, ReviewSubmissionResult } from '@/types/hooks'

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

interface ReviewData {
  teacherData: TeacherData | null
  loading: boolean
  error: string | null
  fetchTeacherData: (teacherId: string, term: 'START' | 'END', reviewerRole: 'HOD' | 'ASST_DEAN') => Promise<TeacherData>
  submitReview: (data: ReviewSubmissionData, reviewerRole: 'HOD' | 'ASST_DEAN') => Promise<ReviewSubmissionResult>
}

// Global cache for review data - persists until page refresh or logout
const globalCache: {
  teacherData: Record<string, TeacherData> | null
  isLoading: boolean
  hasData: boolean
} = {
  teacherData: null,
  isLoading: false,
  hasData: false
}

export function useReviewData(): ReviewData {
  const { status } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTeacherData = useCallback(async (teacherId: string, term: 'START' | 'END', reviewerRole: 'HOD' | 'ASST_DEAN') => {
    const cacheKey = `${teacherId}-${term}-${reviewerRole}`
    
    // Check cache first
    if (globalCache.teacherData && globalCache.teacherData[cacheKey]) {
      return globalCache.teacherData[cacheKey]
    }

    setLoading(true)
    setError(null)

    try {
      const endpoint = reviewerRole === 'HOD' 
        ? '/api/reviews/hod/teacher-data'
        : '/api/reviews/asst-dean/teacher-data'
      
      const response = await fetch(`${endpoint}?teacherId=${teacherId}&term=${term}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch teacher data')
      }
      
      const data = await response.json()
      
      // Update cache
      if (!globalCache.teacherData) {
        globalCache.teacherData = {}
      }
      globalCache.teacherData[cacheKey] = data
      globalCache.hasData = true
      
      return data
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error fetching teacher data')
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const invalidateCache = useCallback(() => {
    globalCache.hasData = false
    globalCache.teacherData = null
  }, [])

  const submitReview = useCallback(async (data: ReviewSubmissionData, reviewerRole: 'HOD' | 'ASST_DEAN') => {
    try {
      const endpoint = reviewerRole === 'HOD' 
        ? '/api/reviews/hod'
        : '/api/reviews/asst-dean'
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit review')
      }
      
      // Invalidate cache after successful submission to ensure fresh data
      invalidateCache()
      
      return response.json()
    } catch (error) {
      throw error
    }
  }, [invalidateCache])

  useEffect(() => {
    // Clear cache when user logs out
    if (status === 'unauthenticated') {
      invalidateCache()
    }
  }, [status, invalidateCache])

  return {
    teacherData: null, // This hook doesn't store current teacher data in state
    loading: loading || globalCache.isLoading,
    error,
    fetchTeacherData,
    submitReview
  }
}
