'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { createUserFriendlyError, getSafeErrorMessage, type ErrorContext } from '@/lib/error-handling'

interface UseErrorHandlerReturn {
  error: string | null
  setError: (error: string | null) => void
  clearError: () => void
  handleError: (error: unknown, context: ErrorContext) => void
  handleAsyncError: <T>(
    asyncFn: () => Promise<T>,
    context: ErrorContext,
    onSuccess?: (result: T) => void,
    onError?: (error: string) => void
  ) => Promise<T | null>
}

/**
 * Custom hook for consistent error handling across components
 * Provides standardized error handling with user-friendly messages
 */
export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const handleError = useCallback((error: unknown, context: ErrorContext) => {
    const userError = createUserFriendlyError(error, context)
    
    // Set the error state
    setError(userError.message)
    
    // Show toast notification based on severity
    if (userError.severity === 'critical' || userError.severity === 'error') {
      toast.error(userError.message, {
        description: userError.suggestion
      })
    } else if (userError.severity === 'warning') {
      toast.warning(userError.message, {
        description: userError.suggestion
      })
    } else {
      toast.info(userError.message, {
        description: userError.suggestion
      })
    }

    // Log for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`Error handled in ${context.operation}:`, {
        originalError: error,
        userError,
        context
      })
    }
  }, [])

  const handleAsyncError = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    context: ErrorContext,
    onSuccess?: (result: T) => void,
    onError?: (error: string) => void
  ): Promise<T | null> => {
    try {
      const result = await asyncFn()
      
      // Clear any previous errors
      clearError()
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(result)
      }
      
      return result
    } catch (error) {
      const userError = createUserFriendlyError(error, context)
      
      // Set the error state
      setError(userError.message)
      
      // Show toast notification
      if (userError.severity === 'critical' || userError.severity === 'error') {
        toast.error(userError.message, {
          description: userError.suggestion
        })
      } else if (userError.severity === 'warning') {
        toast.warning(userError.message, {
          description: userError.suggestion
        })
      } else {
        toast.info(userError.message, {
          description: userError.suggestion
        })
      }

      // Call error callback if provided
      if (onError) {
        onError(userError.message)
      }

      // Log for debugging in development
      if (process.env.NODE_ENV === 'development') {
        console.error(`Async error handled in ${context.operation}:`, {
          originalError: error,
          userError,
          context
        })
      }

      return null
    }
  }, [clearError])

  return {
    error,
    setError,
    clearError,
    handleError,
    handleAsyncError
  }
}

/**
 * Hook for handling form-specific errors with validation
 */
export function useFormErrorHandler() {
  const { error, setError, clearError, handleError } = useErrorHandler()

  const handleValidationError = useCallback((field: string, message: string) => {
    setError(`${field}: ${message}`)
    toast.error(`${field}: ${message}`)
  }, [setError])

  const handleFormSubmitError = useCallback((error: unknown, operation: string) => {
    handleError(error, {
      operation,
      component: 'form'
    })
  }, [handleError])

  return {
    error,
    setError,
    clearError,
    handleError,
    handleValidationError,
    handleFormSubmitError
  }
}

/**
 * Hook for handling API-specific errors
 */
export function useApiErrorHandler() {
  const { error, setError, clearError, handleError } = useErrorHandler()

  const handleApiError = useCallback((error: unknown, endpoint: string, operation: string) => {
    handleError(error, {
      operation: `${operation} (${endpoint})`,
      component: 'api'
    })
  }, [handleError])

  const handleNetworkError = useCallback((error: unknown, operation: string) => {
    handleError(error, {
      operation,
      component: 'network'
    })
  }, [handleError])

  return {
    error,
    setError,
    clearError,
    handleError,
    handleApiError,
    handleNetworkError
  }
}
