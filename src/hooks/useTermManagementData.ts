import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import type { CreateTermRequest, UpdateTermRequest } from '@/types/hooks'

interface Term {
  id: string
  name: string
  year: number
  status: 'INACTIVE' | 'START' | 'END'
  startDate: string
  endDate: string
  departments: {
    id: string
    name: string
    termStates: {
      activeTerm: string
      startTermVisibility?: string
      endTermVisibility?: string
    }[]
  }[]
  createdAt: string
  updatedAt: string
}

interface Department {
  id: string
  name: string
}

interface TermManagementData {
  terms: Term[]
  departments: Department[]
  loading: boolean
  error: string | null
  refetch: () => void
  invalidateCache: () => void
  createTerm: (termData: CreateTermRequest) => Promise<Term>
  updateTerm: (termId: string, termData: UpdateTermRequest) => Promise<Term>
  deleteTerm: (termId: string) => Promise<any>
  startTerm: (termId: string) => Promise<any>
  endTerm: (termId: string) => Promise<any>
}

// Global cache for Term Management data - persists until page refresh or logout
let globalCache: {
  terms: Term[] | null
  departments: Department[] | null
  isLoading: boolean
  hasData: boolean
} = {
  terms: null,
  departments: null,
  isLoading: false,
  hasData: false
}

export function useTermManagementData(): TermManagementData {
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
      // Fetch terms and departments in parallel
      const [termsResponse, departmentsResponse] = await Promise.all([
        fetch('/api/admin/terms'),
        fetch('/api/departments/public')
      ])

      if (!termsResponse.ok || !departmentsResponse.ok) {
        throw new Error('Failed to load Term Management data')
      }

      const termsData = await termsResponse.json()
      const departments = await departmentsResponse.json()

      // Update global cache - this will persist until page refresh
      globalCache = {
        terms: termsData.terms || [],
        departments,
        isLoading: false,
        hasData: true
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
      globalCache.isLoading = false
      // On error, ensure we have safe default values
      globalCache.terms = []
      globalCache.departments = []
    } finally {
      setLoading(false)
    }
  }, [])

  const invalidateCache = useCallback(() => {
    globalCache.hasData = false
    globalCache.terms = null
    globalCache.departments = null
  }, [])

  const refetch = useCallback(() => {
    invalidateCache()
    fetchData()
  }, [fetchData, invalidateCache])

  useEffect(() => {
    // Only fetch if authenticated as Admin and we don't have cached data
    if (status === 'authenticated' && (session?.user as any)?.role === 'ADMIN' && !globalCache.hasData) {
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
  const safeTerms = Array.isArray(globalCache.terms) ? globalCache.terms : []
  const safeDepartments = Array.isArray(globalCache.departments) ? globalCache.departments : []

  return {
    terms: safeTerms,
    departments: safeDepartments,
    loading: loading || globalCache.isLoading,
    error,
    refetch,
    invalidateCache,
    createTerm: async (termData: CreateTermRequest) => {
      const response = await fetch('/api/admin/terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(termData)
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create term')
      }
      await refetch()
      return response.json()
    },
    updateTerm: async (termId: string, termData: UpdateTermRequest) => {
      const response = await fetch(`/api/admin/terms/${termId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(termData)
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update term')
      }
      await refetch()
      return response.json()
    },
    deleteTerm: async (termId: string) => {
      const response = await fetch(`/api/admin/terms/${termId}`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete term')
      }
      await refetch()
      return response.json()
    },
    startTerm: async (termId: string) => {
      const response = await fetch(`/api/admin/terms/${termId}/start`, {
        method: 'POST'
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start term')
      }
      await refetch()
      return response.json()
    },
    endTerm: async (termId: string) => {
      const response = await fetch(`/api/admin/terms/${termId}/end`, {
        method: 'POST'
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to end term')
      }
      await refetch()
      return response.json()
    }
  }
}
