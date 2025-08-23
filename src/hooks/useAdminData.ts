import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { ApiErrorHandler, safeFetch } from '@/lib/api-error-handler'
import type {
  User,
  Department,
  SessionUser
} from '@/types/api'
import type {
  AdminData,
  DashboardStats,
  Activity,
  CreateUserRequest,
  UpdateUserRequest,
  CreateDepartmentRequest,
  UpdateDepartmentRequest
} from '@/types/hooks'

// AdminData interface is now imported from types/hooks

// Global cache for admin data - persists until page refresh or logout
let globalCache: {
  users: User[] | null
  departments: Department[] | null
  stats: DashboardStats | null
  activities: Activity[] | null
  isLoading: boolean
  hasData: boolean
} = {
  users: null,
  departments: null,
  stats: null,
  activities: null,
  isLoading: false,
  hasData: false
}

export function useAdminData(): AdminData {
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
      // Fetch all data in parallel with proper error handling
      const [usersJson, deptJson, activityJson] = await Promise.all([
        safeFetch('/api/admin/users', undefined, 'Admin: fetch users'),
        safeFetch('/api/departments', undefined, 'Admin: fetch departments'),
        safeFetch('/api/admin/activity', undefined, 'Admin: fetch activities')
      ])

      // Validate and sanitize the API responses
      const users: User[] = Array.isArray(usersJson?.data?.users) ? usersJson.data.users : []
      const departments: Department[] = Array.isArray(deptJson?.data?.departments) ? deptJson.data.departments.map((dept: Department) => ({
        ...dept,
        termStates: dept.termStates || [],
        _count: {
          users: dept._count?.users || 0
        }
      })) : []
      const activities: Activity[] = Array.isArray(activityJson?.data?.activities) ? activityJson.data.activities : []

      // Fetch real-time stats from the admin stats API
      let stats: DashboardStats
      try {
        const statsResponse = await safeFetch('/api/admin/stats', undefined, 'Admin: fetch stats')
        console.log('Admin stats response:', statsResponse)
        stats = statsResponse?.stats || {
          totalUsers: users.length,
          totalTeachers: users.filter((u: User) => u.role === 'TEACHER').length,
          totalDepartments: departments.length,
          activeEvaluations: 0,
          completedReviews: 0,
          pendingReviews: 0
        }
      } catch (error) {
        console.error('Failed to fetch admin stats, using fallback:', error)
        stats = {
          totalUsers: users.length,
          totalTeachers: users.filter((u: User) => u.role === 'TEACHER').length,
          totalDepartments: departments.length,
          activeEvaluations: 0,
          completedReviews: 0,
          pendingReviews: 0
        }
      }

      // Update global cache - this will persist until page refresh
      globalCache = {
        users,
        departments,
        stats,
        activities,
        isLoading: false,
        hasData: true
      }
    } catch (err) {
      const apiError = ApiErrorHandler.createError(err, 'Failed to load admin dashboard data')
      setError(ApiErrorHandler.getUserFriendlyMessage(apiError))
      globalCache.isLoading = false
      
      // On error, ensure we have safe default values
      globalCache.users = []
      globalCache.departments = []
      globalCache.stats = {
        totalUsers: 0,
        totalTeachers: 0,
        totalDepartments: 0,
        activeEvaluations: 0,
        completedReviews: 0,
        pendingReviews: 0
      }
      globalCache.activities = []
    } finally {
      setLoading(false)
    }
  }, [])

  const invalidateCache = useCallback(() => {
    globalCache.hasData = false
    globalCache.users = null
    globalCache.departments = null
    globalCache.stats = null
    globalCache.activities = null
  }, [])

  const refetch = useCallback(() => {
    invalidateCache()
    fetchData()
  }, [fetchData, invalidateCache])

  useEffect(() => {
    // Only fetch if authenticated as admin and we don't have cached data
    if (status === 'authenticated' && (session?.user as SessionUser)?.role === 'ADMIN' && !globalCache.hasData) {
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
  // Ensure we never return undefined values and always have valid arrays
  const safeUsers = Array.isArray(globalCache.users) ? globalCache.users : []
  const safeDepartments = Array.isArray(globalCache.departments) ? globalCache.departments.map(dept => ({
    ...dept,
    termStates: dept.termStates || [],
    _count: {
      users: dept._count?.users || 0
    }
  })) : []
  const safeStats = globalCache.stats || {
    totalUsers: 0,
    totalTeachers: 0,
    totalDepartments: 0,
    activeEvaluations: 0,
    completedReviews: 0,
    pendingReviews: 0
  }
  const safeActivities = Array.isArray(globalCache.activities) ? globalCache.activities : []

  // Ensure we always return a valid object structure
  return {
    users: safeUsers,
    departments: safeDepartments,
    stats: safeStats,
    activities: safeActivities,
    loading: loading || globalCache.isLoading,
    error,
    refetch,
    invalidateCache,
    createUser: async (userData: CreateUserRequest): Promise<User> => {
      try {
        const result = await safeFetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        }, 'Admin: create user')
        return result as User
      } catch (error) {
        throw ApiErrorHandler.createError(error, 'Failed to create user')
      }
    },
    updateUser: async (userId: string, userData: UpdateUserRequest): Promise<User> => {
      try {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        })
        if (!response.ok) throw new Error('Failed to update user')
        const data = await response.json()
        return data as User
      } catch (error) {
        throw ApiErrorHandler.createError(error, 'Failed to update user')
      }
    },
    deleteUser: async (userId: string): Promise<void> => {
      try {
        const response = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
        if (!response.ok) throw new Error('Failed to delete user')
        await response.json()
      } catch (error) {
        throw ApiErrorHandler.createError(error, 'Failed to delete user')
      }
    },
    createDepartment: async (departmentData: CreateDepartmentRequest): Promise<Department> => {
      try {
        const response = await fetch('/api/departments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(departmentData)
        })
        if (!response.ok) throw new Error('Failed to create department')
        const data = await response.json()
        return data as Department
      } catch (error) {
        throw ApiErrorHandler.createError(error, 'Failed to create department')
      }
    },
    updateDepartment: async (departmentId: string, departmentData: UpdateDepartmentRequest): Promise<Department> => {
      try {
        const response = await fetch(`/api/departments/${departmentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(departmentData)
        })
        if (!response.ok) throw new Error('Failed to update department')
        const data = await response.json()
        return data as Department
      } catch (error) {
        throw ApiErrorHandler.createError(error, 'Failed to update department')
      }
    },
    deleteDepartment: async (departmentId: string): Promise<void> => {
      try {
        const response = await fetch(`/api/departments/${departmentId}`, { method: 'DELETE' })
        if (!response.ok) throw new Error('Failed to delete department')
        await response.json()
      } catch (error) {
        throw ApiErrorHandler.createError(error, 'Failed to delete department')
      }
    },
    assignHod: async (departmentId: string, hodId: string): Promise<void> => {
      try {
        const response = await fetch(`/api/departments/${departmentId}/assign-hod`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hodId })
        })
        if (!response.ok) throw new Error('Failed to assign HOD')
        await response.json()
      } catch (error) {
        throw ApiErrorHandler.createError(error, 'Failed to assign HOD')
      }
    },
    assignTeachers: async (departmentId: string, teacherIds: string[]): Promise<void> => {
      try {
        const response = await fetch('/api/departments/assign-teachers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ departmentId, teacherIds })
        })
        if (!response.ok) throw new Error('Failed to assign teachers')
        await response.json()
      } catch (error) {
        throw ApiErrorHandler.createError(error, 'Failed to assign teachers')
      }
    }
  }
}
