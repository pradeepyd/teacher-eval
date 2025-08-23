/**
 * Standardized API response utilities
 * Ensures consistent error handling and response formats across all endpoints
 * WITHOUT changing any existing logic, flow, or functionality
 */

import { NextResponse } from 'next/server'
import { createErrorResponse, type ErrorContext } from './error-handling'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
  statusCode: number
}

export interface ApiErrorResponse {
  success: false
  error: string
  message: string
  timestamp: string
  statusCode: number
  details?: unknown
}

/**
 * Creates a successful API response
 */
export function createSuccessResponse<T>(
  data: T, 
  statusCode: number = 200,
  message?: string
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    statusCode
  }
  
  return NextResponse.json(response, { status: statusCode })
}

/**
 * Creates an error API response using the centralized error handling
 */
export function createApiErrorResponse(
  error: unknown,
  context: ErrorContext,
  statusCode: number = 500,
  details?: any
): NextResponse<ApiErrorResponse> {
  const errorResponse = createErrorResponse(error, context)
  
  const response: ApiErrorResponse = {
    success: false,
    error: errorResponse.error,
    message: errorResponse.title,
    timestamp: new Date().toISOString(),
    statusCode,
    details
  }
  
  return NextResponse.json(response, { status: statusCode })
}

/**
 * Creates a simple error response (for backward compatibility)
 * This maintains existing functionality while providing consistent format
 */
export function createSimpleErrorResponse(
  error: string | Error,
  statusCode: number = 500
): NextResponse<{ error: string }> {
  const errorMessage = error instanceof Error ? error.message : error
  
  return NextResponse.json({ 
    error: errorMessage 
  }, { status: statusCode })
}

/**
 * Creates a validation error response
 */
export function createValidationErrorResponse(
  errors: string[],
  statusCode: number = 400
): NextResponse<{ error: string; details: string[] }> {
  return NextResponse.json({ 
    error: 'Validation failed',
    details: errors
  }, { status: statusCode })
}

/**
 * Creates an unauthorized response
 */
export function createUnauthorizedResponse(
  message: string = 'Unauthorized'
): NextResponse<{ error: string }> {
  return NextResponse.json({ 
    error: message 
  }, { status: 401 })
}

/**
 * Creates a forbidden response
 */
export function createForbiddenResponse(
  message: string = 'Forbidden'
): NextResponse<{ error: string }> {
  return NextResponse.json({ 
    error: message 
  }, { status: 403 })
}

/**
 * Creates a not found response
 */
export function createNotFoundResponse(
  message: string = 'Resource not found'
): NextResponse<{ error: string }> {
  return NextResponse.json({ 
    error: message 
  }, { status: 404 })
}

/**
 * Wraps an existing API response to ensure it has the standard format
 * This allows gradual migration without breaking existing functionality
 */
export function wrapExistingResponse<T>(
  existingResponse: T,
  statusCode: number = 200
): NextResponse<ApiResponse<T>> {
  return createSuccessResponse(existingResponse, statusCode)
}

/**
 * Helper to check if a response is already in the standard format
 */
export function isStandardResponse(response: any): response is ApiResponse {
  return response && typeof response === 'object' && 'success' in response
}

/**
 * Standardizes any existing response format to the new standard
 * This ensures backward compatibility while providing consistent structure
 */
export function standardizeResponse<T>(
  existingResponse: T,
  statusCode: number = 200
): NextResponse<ApiResponse<T>> {
  // If it's already a standard response, return as is
  if (isStandardResponse(existingResponse)) {
    return NextResponse.json(existingResponse, { status: statusCode })
  }
  
  // Wrap existing response in standard format
  return wrapExistingResponse(existingResponse, statusCode)
}
