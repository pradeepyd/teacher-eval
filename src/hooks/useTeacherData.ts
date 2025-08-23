import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import type { 
  TeacherAnswerSubmission, 
  SubmissionResult, 
  EvaluationUpdateData, 
  EvaluationResult, 
  AnswerUpdateData, 
  AnswerUpdateResult 
} from '@/types/hooks'

interface Question {
  id: string
  type: 'TEXT' | 'TEXTAREA' | 'MCQ' | 'CHECKBOX'
  question: string
  options?: string[]
  existingAnswer?: string
}

interface EvaluationData {
  questions: Question[]
  existingSelfComment: string
  isSubmitted: boolean
  canEdit: boolean
}

interface EvaluationStatus {
  activeTerm: string | null
  start: {
    status: string
    questionsCount: number
    answersCount: number
    hasSelfComment: boolean
    canSubmit: boolean
    deadline?: string | null
  }
  end: {
    status: string
    questionsCount: number
    answersCount: number
    hasSelfComment: boolean
    canSubmit: boolean
    deadline?: string | null
  }
}

interface TermState {
  activeTerm: 'START' | 'END'
  startTermVisibility?: string
  endTermVisibility?: string
}

interface TeacherData {
  evaluationStatus: EvaluationStatus | null
  startData: EvaluationData | null
  endData: EvaluationData | null
  termState: TermState | null
  loading: boolean
  error: string | null
  refetch: () => void
  invalidateCache: () => void
  fetchTermData: (term: 'START' | 'END') => Promise<EvaluationData>
  submitAnswers: (answers: TeacherAnswerSubmission[], selfComment: string, term: 'START' | 'END') => Promise<SubmissionResult>
  getEvaluationReport: (term: 'START' | 'END') => Promise<unknown>
  fetchEvaluation: (evaluationId: string) => Promise<unknown>
  updateEvaluation: (evaluationId: string, data: EvaluationUpdateData) => Promise<EvaluationResult>
  fetchQuestions: (term: 'START' | 'END') => Promise<unknown>
  updateAnswers: (data: AnswerUpdateData) => Promise<AnswerUpdateResult>
}

// Global cache for teacher data - persists until page refresh or logout
let globalCache: {
  evaluationStatus: EvaluationStatus | null
  startData: EvaluationData | null
  endData: EvaluationData | null
  termState: TermState | null
  isLoading: boolean
  hasData: boolean
} = {
  evaluationStatus: null,
  startData: null,
  endData: null,
  termState: null,
  isLoading: false,
  hasData: false
}

export function useTeacherData(): TeacherData {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    // If already loading, don't start another fetch
    if (globalCache.isLoading) return

    // Use cached data if available, but still allow refetching for updates
    if (globalCache.hasData && !loading) {
      return // Use cached data, but don't prevent manual refetching
    }

    globalCache.isLoading = true
    setLoading(true)
    setError(null)

    try {
      const userDepartmentId = (session?.user as Record<string, unknown>)?.departmentId
      if (!userDepartmentId) {
        throw new Error('No department ID found')
      }

      // Fetch evaluation status and term state in parallel
      const [statusResponse, termStateResponse] = await Promise.all([
        fetch('/api/teacher-evaluation/status'),
        fetch(`/api/departments/${userDepartmentId}/term-state`)
      ])

      if (!statusResponse.ok || !termStateResponse.ok) {
        throw new Error('Failed to load teacher data')
      }

      const evaluationStatus = await statusResponse.json()
      const termState = await termStateResponse.json()

      // Extract data from standardized API responses
      const evaluationStatusData = evaluationStatus.data || evaluationStatus
      const termStateData = termState.data || termState

      // Update global cache - this will persist until page refresh
      globalCache = {
        evaluationStatus: evaluationStatusData,
        startData: null, // Will be fetched on demand
        endData: null,   // Will be fetched on demand
        termState: termStateData,
        isLoading: false,
        hasData: true
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
      globalCache.isLoading = false
      // On error, ensure we have safe default values
      globalCache.evaluationStatus = null
      globalCache.termState = null
    } finally {
      setLoading(false)
    }
  }, [session])

  const fetchTermData = useCallback(async (term: 'START' | 'END'): Promise<EvaluationData> => {
    try {
      // Always fetch fresh data for term-specific requests
      const response = await fetch(`/api/teacher-evaluation/questions?term=${term}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch ${term} evaluation data`)
      }
      const responseData = await response.json()
      
      // Extract data from standardized API response
      const data = responseData.data || responseData
      
      // Update cache with fresh data
      if (term === 'START') {
        globalCache.startData = data
      } else {
        globalCache.endData = data
      }
      
      return data
    } catch (error) {
      throw error
    }
  }, [])

  const invalidateCache = useCallback(() => {
    globalCache.hasData = false
    globalCache.evaluationStatus = null
    globalCache.startData = null
    globalCache.endData = null
    globalCache.termState = null
  }, [])

  const refetch = useCallback(() => {
    invalidateCache()
    fetchData()
  }, [fetchData, invalidateCache])

  useEffect(() => {
    // Only fetch if authenticated as teacher and we don't have cached data
    if (status === 'authenticated' && (session?.user as Record<string, unknown>)?.role === 'TEACHER' && !globalCache.hasData) {
      fetchData()
    }
  }, [status, session, fetchData])

  // Auto-fetch term data when evaluation status indicates questions are available
  useEffect(() => {
    if (globalCache.evaluationStatus && !globalCache.startData && !globalCache.endData) {
      const fetchAvailableTerms = async () => {
        try {
          // Fetch data for terms that have questions available
          if (globalCache.evaluationStatus?.start?.status !== 'NOT_AVAILABLE') {
            await fetchTermData('START')
          }
          if (globalCache.evaluationStatus?.end?.status !== 'NOT_AVAILABLE') {
            await fetchTermData('END')
          }
        } catch (error) {
          // Silently handle errors for auto-fetch
          console.warn('Auto-fetch of term data failed:', error)
        }
      }
      
      fetchAvailableTerms()
    }
  }, [globalCache.evaluationStatus, globalCache.startData, globalCache.endData, fetchTermData])

  // Clear cache when user logs out
  useEffect(() => {
    if (status === 'unauthenticated') {
      invalidateCache()
    }
  }, [status, invalidateCache])



  // Validate and sanitize evaluation status data to prevent UI bugs
  const validateEvaluationStatus = (status: EvaluationStatus | null) => {
    if (!status) return null
    
    const validated = { ...status }
    
    // Ensure answersCount never exceeds questionsCount
    if (validated.start) {
      validated.start.answersCount = Math.min(validated.start.answersCount || 0, validated.start.questionsCount || 0)
    }
    if (validated.end) {
      validated.end.answersCount = Math.min(validated.end.answersCount || 0, validated.end.questionsCount || 0)
    }
    
    return validated
  }

  return {
    evaluationStatus: validateEvaluationStatus(globalCache.evaluationStatus),
    startData: globalCache.startData,
    endData: globalCache.endData,
    termState: globalCache.termState,
    loading: loading || globalCache.isLoading,
    error,
    refetch,
    invalidateCache,
    fetchTermData,
    submitAnswers: useCallback(async (answers: TeacherAnswerSubmission[], selfComment: string, term: 'START' | 'END') => {
      try {
        const response = await fetch('/api/teacher-answers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers, selfComment, term })
        })
        if (!response.ok) throw new Error('Failed to submit answers')
        const responseData = await response.json()
        const data = responseData.data || responseData
        
        // After successful submission, fetch fresh status to update the UI
        try {
          const statusResponse = await fetch('/api/teacher-evaluation/status')
          if (statusResponse.ok) {
            const statusData = await statusResponse.json()
            const freshStatus = statusData.data || statusData
            globalCache.evaluationStatus = freshStatus
          }
        } catch (statusError) {
          console.warn('Failed to fetch fresh status after submission:', statusError)
        }
        
        return data
      } catch (error) {
        throw error
      }
    }, []),
    getEvaluationReport: useCallback(async (term: 'START' | 'END') => {
      try {
        const response = await fetch(`/api/reviews/teacher/evaluation-report?term=${term}`)
        if (!response.ok) throw new Error('Failed to get evaluation report')
        const responseData = await response.json()
        const data = responseData.data || responseData
        return data
      } catch (error) {
        throw error
      }
    }, []),
    fetchEvaluation: useCallback(async (evaluationId: string) => {
      try {
        const response = await fetch(`/api/teacher-evaluation/${evaluationId}`)
        if (!response.ok) throw new Error('Failed to fetch evaluation')
        const responseData = await response.json()
        const data = responseData.data || responseData
        return data
      } catch (error) {
        throw error
      }
    }, []),
    updateEvaluation: useCallback(async (evaluationId: string, data: EvaluationUpdateData) => {
      try {
        const response = await fetch(`/api/teacher-evaluation/${evaluationId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        if (!response.ok) throw new Error('Failed to update evaluation')
        const responseData = await response.json()
        const updatedData = responseData.data || responseData
        return {
          success: true,
          evaluation: updatedData
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }, []),
    fetchQuestions: useCallback(async (term: 'START' | 'END') => {
      try {
        const response = await fetch(`/api/teacher-evaluation/questions?term=${term}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch ${term} questions`)
        }
        const responseData = await response.json()
        const data = responseData.data || responseData
        return data
      } catch (error) {
        throw error
      }
    }, []),
    updateAnswers: useCallback(async (data: AnswerUpdateData) => {
      try {
        const response = await fetch(`/api/teacher-answers`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        if (!response.ok) {
          throw new Error('Failed to update answers')
        }
        const responseData = await response.json()
        const updatedData = responseData.data || responseData
        return updatedData
      } catch (error) {
        throw error
      }
    }, [])
  }
}
