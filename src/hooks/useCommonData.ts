import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface Department {
  id: string
  name: string
}

interface TermState {
  activeTerm: 'START' | 'END'
  startTermVisibility?: string
  endTermVisibility?: string
}

interface CommonData {
  departments: Department[]
  termStates: Record<string, TermState>
  loading: boolean
  error: string | null
  refetch: () => void
  invalidateCache: () => void
  fetchTermStateForDepartment: (departmentId: string) => Promise<TermState>
}

// Global cache for common data - persists until page refresh or logout
const globalCache: {
  departments: Department[] | null
  termStates: Record<string, TermState> | null
  isLoading: boolean
  hasData: boolean
} = {
  departments: null,
  termStates: null,
  isLoading: false,
  hasData: false
}

export function useCommonData(): CommonData {
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
      const departmentsResponse = await fetch('/api/departments/public')
      if (!departmentsResponse.ok) {
        throw new Error('Failed to fetch departments')
      }
      const departments = await departmentsResponse.json()

      // Update global cache with departments
      globalCache.departments = departments
      globalCache.termStates = {}
      globalCache.isLoading = false
      globalCache.hasData = true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
      globalCache.isLoading = false
      // On error, ensure we have safe default values
      globalCache.departments = []
      globalCache.termStates = {}
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTermStateForDepartment = useCallback(async (departmentId: string) => {
    try {
      const response = await fetch(`/api/departments/${departmentId}/term-state`)
      if (!response.ok) {
        throw new Error('Failed to fetch term state')
      }
      const termState = await response.json()
      
      // Update cache with term state for this department
      if (globalCache.termStates) {
        globalCache.termStates[departmentId] = termState
      }
      
      return termState
    } catch (error) {
      throw error
    }
  }, [])

  const invalidateCache = useCallback(() => {
    globalCache.hasData = false
    globalCache.departments = null
    globalCache.termStates = null
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
  const safeTermStates = globalCache.termStates || {}

  return {
    departments: safeDepartments,
    termStates: safeTermStates,
    loading: loading || globalCache.isLoading,
    error,
    refetch,
    invalidateCache,
    // Expose fetch function for on-demand fetching
    fetchTermStateForDepartment
  }
}
