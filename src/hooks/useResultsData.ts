import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import type { TeacherAnswer } from '@/types/hooks'

interface Department {
  id: string
  name: string
}

interface TeacherResult {
  id: string
  name: string
  department: string
  finalScore: number
  promoted: boolean
  status: 'completed' | 'pending'
  comments: {
    hod: string
    asstDean: string
    dean: string
  }
  teacherAnswers: TeacherAnswer[]
  createdAt: string
}

interface ResultsData {
  results: TeacherResult[]
  summary: {
    totalTeachers: number
    departmentsIncluded: string[]
    termsIncluded: string[]
    generatedAt: string
    generatedBy: string
  }
}

interface ResultsDataHook {
  departments: Department[]
  results: ResultsData | null
  loading: boolean
  error: string | null
  refetch: () => void
  invalidateCache: () => void
  fetchResultsForDepartment: (departmentId: string, year: string) => Promise<unknown>
}

// Global cache for Results data - persists until page refresh or logout
const globalCache: {
  departments: Department[] | null
  results: Record<string, ResultsData> | null
  isLoading: boolean
  hasData: boolean
} = {
  departments: null,
  results: null,
  isLoading: false,
  hasData: false
}

export function useResultsData(): ResultsDataHook {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    // If already loading, don't start another fetch
    if (globalCache.isLoading) return

    // If we already have data, use it (session-based caching)
    if (globalCache.hasData) {
      return // Use cached data for the entire session
    }

    globalCache.isLoading = true
    setLoading(true)
    setError(null)

    try {
      // Fetch departments
      const departmentsResponse = await fetch('/api/departments')
      if (!departmentsResponse.ok) {
        throw new Error('Failed to fetch departments')
      }
      const departments = await departmentsResponse.json()

      // Update global cache with departments
      globalCache.departments = departments
      globalCache.results = {}
      globalCache.isLoading = false
      globalCache.hasData = true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
      globalCache.isLoading = false
      // On error, ensure we have safe default values
      globalCache.departments = []
      globalCache.results = {}
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchResultsForDepartment = useCallback(async (departmentId: string, year: string) => {
    try {
      const response = await fetch(`/api/reports/results?departmentId=${departmentId}&year=${year}`)
      if (!response.ok) {
        throw new Error('Failed to fetch results')
      }
      const results = await response.json()
      
      // Create cache key
      const cacheKey = `${departmentId}-${year}`
      
      // Update cache with results for this department and year
      if (globalCache.results) {
        globalCache.results[cacheKey] = results
      } else {
        globalCache.results = { [cacheKey]: results }
      }
      
      return results
    } catch (error) {
      throw error
    }
  }, [])

  const invalidateCache = useCallback(() => {
    globalCache.hasData = false
    globalCache.departments = null
    globalCache.results = null
  }, [])

  const refetch = useCallback(() => {
    invalidateCache()
    fetchData()
  }, [fetchData, invalidateCache])

  useEffect(() => {
    // Only fetch if authenticated and we don't have cached data
    if (status === 'authenticated' && !globalCache.hasData) {
      fetchData()
    }
  }, [status, session, fetchData])

  // Clear cache when user logs out
  useEffect(() => {
    if (status === 'unauthenticated') {
      invalidateCache()
    }
  }, [status, invalidateCache])

  // Always return safe default values, even before data is fetched
  const safeDepartments = Array.isArray(globalCache.departments) ? globalCache.departments : []

  return {
    departments: safeDepartments,
    results: null, // Will be fetched on demand using fetchResultsForDepartment
    loading: loading || globalCache.isLoading,
    error,
    refetch,
    invalidateCache,
    // Expose fetch function for on-demand fetching
    fetchResultsForDepartment
  }
}
