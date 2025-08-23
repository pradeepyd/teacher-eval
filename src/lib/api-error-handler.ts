/**
 * Standardized API error handling utilities
 */

export interface ApiError {
  message: string
  code?: string
  status?: number
  details?: any
}

export class ApiErrorHandler {
  static createError(error: any, fallbackMessage: string = 'An unexpected error occurred'): ApiError {
    // Handle fetch errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        message: 'Network error. Please check your connection and try again.',
        code: 'NETWORK_ERROR',
        status: 0
      }
    }

    // Handle Response objects
    if (error instanceof Response) {
      return {
        message: `Server error (${error.status}). Please try again later.`,
        code: 'HTTP_ERROR',
        status: error.status
      }
    }

    // Handle objects with error properties
    if (error && typeof error === 'object') {
      if (error.message) {
        return {
          message: String(error.message),
          code: error.code,
          status: error.status,
          details: error.details
        }
      }

      if (error.error) {
        return {
          message: String(error.error),
          code: error.code,
          status: error.status
        }
      }
    }

    // Handle string errors
    if (typeof error === 'string') {
      return {
        message: error,
        code: 'UNKNOWN_ERROR'
      }
    }

    // Fallback
    return {
      message: fallbackMessage,
      code: 'UNKNOWN_ERROR'
    }
  }

  static async handleResponse(response: Response): Promise<any> {
    try {
      // Check if response is ok
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`
        let errorDetails = null

        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorMessage
          errorDetails = errorData.details || errorData
        } catch {
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || errorMessage
        }

        throw this.createError({
          message: errorMessage,
          status: response.status,
          details: errorDetails
        })
      }

      // Parse response JSON
      const data = await response.json()
      return data
    } catch (error) {
      // If it's already our error, re-throw it
      if (error && typeof error === 'object' && 'message' in error && 'code' in error) {
        throw error
      }

      // Otherwise, wrap it
      throw this.createError(error, 'Failed to process server response')
    }
  }

  static logError(error: ApiError, context?: string) {
    const logMessage = context ? `[${context}] ${error.message}` : error.message
    
    if (process.env.NODE_ENV === 'development') {
      console.error(logMessage, error)
    }

    // In production, you might want to send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: sendToErrorReporting(error, context)
    }
  }

  static getUserFriendlyMessage(error: ApiError): string {
    // Map technical errors to user-friendly messages
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Unable to connect. Please check your internet connection.'
      
      case 'HTTP_ERROR':
        if (error.status === 401) {
          return 'Please log in to continue.'
        }
        if (error.status === 403) {
          return 'You do not have permission to perform this action.'
        }
        if (error.status === 404) {
          return 'The requested resource was not found.'
        }
        if (error.status === 500) {
          return 'Server error. Please try again later.'
        }
        return 'Something went wrong. Please try again.'
      
      case 'VALIDATION_ERROR':
        return error.message // Validation messages are usually user-friendly
      
      default:
        // Return the original message if it seems user-friendly, otherwise use generic message
        if (error.message && error.message.length < 100 && !error.message.includes('Error:')) {
          return error.message
        }
        return 'Something went wrong. Please try again.'
    }
  }
}

// Hook for error handling in components
export function useApiErrorHandler() {
  const handleError = (error: any, context?: string): string => {
    const apiError = ApiErrorHandler.createError(error)
    ApiErrorHandler.logError(apiError, context)
    return ApiErrorHandler.getUserFriendlyMessage(apiError)
  }

  return { handleError }
}

// Utility function for safe API calls
export async function safeApiCall<T>(
  apiCall: () => Promise<Response>,
  context?: string
): Promise<T> {
  try {
    const response = await apiCall()
    return await ApiErrorHandler.handleResponse(response)
  } catch (error) {
    const apiError = ApiErrorHandler.createError(error)
    ApiErrorHandler.logError(apiError, context)
    throw apiError
  }
}

// Wrapper for fetch calls with standardized error handling
export async function safeFetch(
  url: string,
  options?: RequestInit,
  context?: string
): Promise<any> {
  return safeApiCall(
    () => fetch(url, options),
    context || `API call to ${url}`
  )
}

