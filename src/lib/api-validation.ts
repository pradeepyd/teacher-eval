/**
 * API validation utilities
 * Provides consistent input validation across all endpoints
 * WITHOUT changing any existing logic, flow, or functionality
 */

import { z } from 'zod'
import { createValidationErrorResponse } from './api-response'

// Common validation schemas
export const commonSchemas = {
  // Basic field validations
  id: z.string().min(1, 'ID is required'),
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  
  // Role validations
  role: z.enum(['ADMIN', 'DEAN', 'ASST_DEAN', 'HOD', 'TEACHER']),
  
  // Term validations
  term: z.enum(['START', 'END']),
  
  // Question type validations
  questionType: z.enum(['TEXT', 'TEXTAREA', 'MCQ', 'CHECKBOX']),
  
  // Score validations
  score: z.number().min(0, 'Score must be non-negative').max(10, 'Score cannot exceed 10'),
  
  // Department ID validation
  departmentId: z.string().min(1, 'Department ID is required'),
  
  // Year validation
  year: z.number().int().min(2020, 'Year must be 2020 or later') 
}

// Specific validation schemas for different operations
export const validationSchemas = {
  // User creation/update
  user: z.object({
    name: commonSchemas.name,
    email: commonSchemas.email,
    password: commonSchemas.password.optional(),
    role: commonSchemas.role,
    departmentId: commonSchemas.departmentId.optional()
  }),
  
  // Question creation/update
  question: z.object({
    question: z.string().min(1, 'Question text is required').max(1000, 'Question too long'),
    type: commonSchemas.questionType,
    term: commonSchemas.term,
    options: z.array(z.string()).optional(),
    optionScores: z.array(z.number()).optional(),
    order: z.number().int().min(0).optional(),
    departmentId: z.string().optional() // Allow empty string since it comes from session for HODs
  }),
  
  // Evaluation submission
  evaluation: z.object({
    answers: z.array(z.object({
      questionId: commonSchemas.id,
      answer: z.string().min(1, 'Answer is required')
    })),
    selfComment: z.string().min(1, 'Self comment is required').max(1000, 'Comment too long'),
    term: commonSchemas.term
  }),
  
  // Review submission
  review: z.object({
    teacherId: commonSchemas.id,
    comment: z.string().min(1, 'Comment is required').max(1000, 'Comment too long'),
    score: commonSchemas.score,
    term: commonSchemas.term
  }),
  
  // Term management
  term: z.object({
    status: commonSchemas.term,
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    departmentIds: z.array(commonSchemas.departmentId).optional()
  })
}

/**
 * Validates request body using a Zod schema
 * Returns validation error response if validation fails
 * Otherwise returns null (indicating success)
 */
export function validateRequestBody<T>(
  body: unknown,
  schema: z.ZodSchema<T>,
  context: string
): { success: false; response: Response } | { success: true; data: T } {
  const result = schema.safeParse(body)
  
  if (!result.success) {
    const errors = result.error.issues.map(issue => issue.message)
    return {
      success: false,
      response: createValidationErrorResponse(errors)
    }
  }
  
  return {
    success: true,
    data: result.data
  }
}

/**
 * Validates query parameters using a Zod schema
 * Returns validation error response if validation fails
 * Otherwise returns null (indicating success)
 */
export function validateQueryParams<T>(
  params: unknown,
  schema: z.ZodSchema<T>,
  context: string
): { success: false; response: Response } | { success: true; data: T } {
  const result = schema.safeParse(params)
  
  if (!result.success) {
    const errors = result.error.issues.map(issue => issue.message)
    return {
      success: false,
      response: createValidationErrorResponse(errors)
    }
  }
  
  return {
    success: true,
    data: result.data
  }
}

/**
 * Validates path parameters using a Zod schema
 * Returns validation error response if validation fails
 * Otherwise returns null (indicating success)
 */
export function validatePathParams<T>(
  params: unknown,
  schema: z.ZodSchema<T>,
  context: string
): { success: false; response: Response } | { success: true; data: T } {
  const result = schema.safeParse(params)
  
  if (!result.success) {
    const errors = result.error.issues.map(issue => issue.message)
    return {
      success: false,
      response: createValidationErrorResponse(errors)
    }
  }
  
  return {
    success: true,
    data: result.data
  }
}

/**
 * Helper function to extract and validate common query parameters
 */
export function validateCommonQueryParams(searchParams: URLSearchParams) {
  const params = {
    departmentId: searchParams.get('departmentId'),
    term: searchParams.get('term'),
    year: searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined
  }
  
  const schema = z.object({
    departmentId: commonSchemas.departmentId.optional(),
    term: commonSchemas.term.optional(),
    year: commonSchemas.year.optional()
  })
  
  return validateQueryParams(params, schema, 'query parameters')
}

/**
 * Helper function to validate pagination parameters
 */
export function validatePaginationParams(searchParams: URLSearchParams) {
  const params = {
    page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10
  }
  
  const schema = z.object({
    page: z.number().int().min(1, 'Page must be 1 or greater'),
    limit: z.number().int().min(1, 'Limit must be 1 or greater').max(100, 'Limit cannot exceed 100')
  })
  
  return validateQueryParams(params, schema, 'pagination parameters')
}

/**
 * Sanitizes string input to prevent XSS and injection attacks
 * This is a basic sanitization - for production, consider using DOMPurify
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return ''
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 1000) // Limit length
}

/**
 * Sanitizes object input recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = {}
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value)
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value)
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) : item
      )
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}
