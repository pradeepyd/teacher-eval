/**
 * Centralized error handling utilities for consistent user experience
 * Prevents raw error messages from being exposed to end users
 */

export interface UserFriendlyError {
  title: string
  message: string
  suggestion?: string
  severity: 'info' | 'warning' | 'error' | 'critical'
}

export interface ErrorContext {
  operation: string
  component?: string
  userId?: string
  additionalInfo?: Record<string, unknown>
}

/**
 * Maps internal error messages to user-friendly messages
 */
const ERROR_MESSAGE_MAP: Record<string, UserFriendlyError> = {
  // Authentication & Authorization
  'UNAUTHORIZED': {
    title: 'Access Denied',
    message: 'You do not have permission to perform this action.',
    suggestion: 'Please contact your administrator if you believe this is an error.',
    severity: 'error'
  },
  'FORBIDDEN': {
    title: 'Access Restricted',
    message: 'This resource is not accessible with your current permissions.',
    suggestion: 'Please check your role and department access.',
    severity: 'error'
  },
  'INVALID_SESSION': {
    title: 'Session Expired',
    message: 'Your session has expired. Please log in again.',
    suggestion: 'Click the logout button and sign in again.',
    severity: 'warning'
  },

  // Data Operations
  'NOT_FOUND': {
    title: 'Resource Not Found',
    message: 'The requested information could not be found.',
    suggestion: 'Please refresh the page or check if the resource still exists.',
    severity: 'warning'
  },
  'ALREADY_EXISTS': {
    title: 'Duplicate Entry',
    message: 'This item already exists in the system.',
    suggestion: 'Please check for existing entries or use a different identifier.',
    severity: 'warning'
  },
  'VALIDATION_FAILED': {
    title: 'Invalid Information',
    message: 'Please check the information you entered and try again.',
    suggestion: 'Ensure all required fields are filled correctly.',
    severity: 'info'
  },

  // Database & Network
  'DATABASE_ERROR': {
    title: 'System Error',
    message: 'We encountered a technical issue while processing your request.',
    suggestion: 'Please try again in a few moments. If the problem persists, contact support.',
    severity: 'error'
  },
  'NETWORK_ERROR': {
    title: 'Connection Error',
    message: 'Unable to connect to the server. Please check your internet connection.',
    suggestion: 'Try refreshing the page or check your network connection.',
    severity: 'warning'
  },
  'TIMEOUT': {
    title: 'Request Timeout',
    message: 'The operation took too long to complete.',
    suggestion: 'Please try again. If the problem continues, contact support.',
    severity: 'warning'
  },

  // Business Logic
  'INVALID_TERM': {
    title: 'Invalid Term',
    message: 'The selected term is not valid for this operation.',
    suggestion: 'Please select a valid term from the dropdown.',
    severity: 'warning'
  },
  'TERM_NOT_ACTIVE': {
    title: 'Term Not Active',
    message: 'This operation cannot be performed on an inactive term.',
    suggestion: 'Please select an active term or wait for the term to become active.',
    severity: 'warning'
  },
  'ALREADY_SUBMITTED': {
    title: 'Already Submitted',
    message: 'This evaluation has already been submitted and cannot be modified.',
    suggestion: 'Contact your administrator if you need to make changes.',
    severity: 'info'
  },
  'DEADLINE_PASSED': {
    title: 'Deadline Passed',
    message: 'The submission deadline for this evaluation has passed.',
    suggestion: 'Contact your administrator if you need an extension.',
    severity: 'warning'
  },

  // Generic fallbacks
  'UNKNOWN_ERROR': {
    title: 'Unexpected Error',
    message: 'An unexpected error occurred. Please try again.',
    suggestion: 'If the problem persists, contact your system administrator.',
    severity: 'error'
  },
  'OPERATION_FAILED': {
    title: 'Operation Failed',
    message: 'The operation could not be completed successfully.',
    suggestion: 'Please try again or contact support if the issue continues.',
    severity: 'error'
  }
}

/**
 * Converts any error to a user-friendly error message
 */
export function createUserFriendlyError(
  error: unknown, 
  context: ErrorContext
): UserFriendlyError {
  // If it's already a UserFriendlyError, return it
  if (error && typeof error === 'object' && 'title' in error && 'message' in error) {
    return error as UserFriendlyError
  }

  // Extract error message
  let errorMessage = 'UNKNOWN_ERROR'
  let originalMessage = ''

  if (error instanceof Error) {
    originalMessage = error.message
    // Try to match common error patterns
    if (error.message.includes('Unauthorized') || error.message.includes('401')) {
      errorMessage = 'UNAUTHORIZED'
    } else if (error.message.includes('Forbidden') || error.message.includes('403')) {
      errorMessage = 'FORBIDDEN'
    } else if (error.message.includes('Not Found') || error.message.includes('404')) {
      errorMessage = 'NOT_FOUND'
    } else if (error.message.includes('Validation') || error.message.includes('Invalid')) {
      errorMessage = 'VALIDATION_FAILED'
    } else if (error.message.includes('Database') || error.message.includes('SQL')) {
      errorMessage = 'DATABASE_ERROR'
    } else if (error.message.includes('Network') || error.message.includes('fetch')) {
      errorMessage = 'NETWORK_ERROR'
    } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      errorMessage = 'TIMEOUT'
    } else if (error.message.includes('term') || error.message.includes('Term')) {
      errorMessage = 'INVALID_TERM'
    } else if (error.message.includes('already submitted') || error.message.includes('submitted')) {
      errorMessage = 'ALREADY_SUBMITTED'
    } else if (error.message.includes('deadline') || error.message.includes('Deadline')) {
      errorMessage = 'DEADLINE_PASSED'
    } else if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      errorMessage = 'ALREADY_EXISTS'
    }
  } else if (typeof error === 'string') {
    originalMessage = error
    // Try to match string patterns
    if (error.toLowerCase().includes('unauthorized')) {
      errorMessage = 'UNAUTHORIZED'
    } else if (error.toLowerCase().includes('forbidden')) {
      errorMessage = 'FORBIDDEN'
    } else if (error.toLowerCase().includes('not found')) {
      errorMessage = 'NOT_FOUND'
    }
  }

  // Get the mapped error or fallback to generic
  const mappedError = ERROR_MESSAGE_MAP[errorMessage] || ERROR_MESSAGE_MAP['UNKNOWN_ERROR']

  // Log the original error for debugging (in development)
  if (process.env.NODE_ENV === 'development') {
    console.error(`Error in ${context.operation}:`, {
      originalError: error,
      originalMessage,
      context,
      mappedTo: errorMessage
    })
  }

  return {
    ...mappedError,
    message: `${mappedError.message} (${context.operation})`
  }
}

/**
 * Creates a standardized error response for API endpoints
 */
export function createErrorResponse(
  error: unknown,
  context: ErrorContext,
  statusCode: number = 500
) {
  const userError = createUserFriendlyError(error, context)
  
  return {
    error: userError.message,
    title: userError.title,
    suggestion: userError.suggestion,
    severity: userError.severity,
    statusCode,
    timestamp: new Date().toISOString(),
    operation: context.operation
  }
}

/**
 * Handles errors in React components with consistent user feedback
 */
export function handleComponentError(
  error: unknown,
  context: ErrorContext,
  setError: (error: string) => void,
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void
) {
  const userError = createUserFriendlyError(error, context)
  
  // Set the error state with user-friendly message
  setError(userError.message)
  
  // Show toast notification
  showToast(userError.message, userError.severity === 'critical' ? 'error' : 'warning')
  
  // Log for debugging
  if (process.env.NODE_ENV === 'development') {
    console.error(`Component error in ${context.operation}:`, {
      originalError: error,
      userError,
      context
    })
  }
}

/**
 * Safely extracts error message without exposing internal details
 */
export function getSafeErrorMessage(error: unknown, fallback: string = 'An error occurred'): string {
  if (error instanceof Error) {
    // Only expose safe, user-friendly error messages
    const message = error.message.toLowerCase()
    
    // Allow specific user-facing messages
    if (message.includes('please') || 
        message.includes('required') || 
        message.includes('invalid') ||
        message.includes('already') ||
        message.includes('deadline') ||
        message.includes('term')) {
      return error.message
    }
    
    // For internal errors, return fallback
    return fallback
  }
  
  if (typeof error === 'string') {
    // Only allow safe string messages
    const message = error.toLowerCase()
    if (message.includes('please') || 
        message.includes('required') || 
        message.includes('invalid') ||
        message.includes('already') ||
        message.includes('deadline') ||
        message.includes('term')) {
      return error
    }
    return fallback
  }
  
  return fallback
}
