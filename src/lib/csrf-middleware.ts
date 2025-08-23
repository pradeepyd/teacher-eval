/**
 * Simplified CSRF Middleware for API Routes
 * Basic token validation for state-changing operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

export interface CSRFMiddlewareOptions {
  // Routes that require CSRF protection
  protectedMethods?: string[]
  // Routes that are exempt from CSRF protection
  exemptRoutes?: string[]
  // Custom error message
  errorMessage?: string
}

const DEFAULT_OPTIONS: CSRFMiddlewareOptions = {
  protectedMethods: ['POST', 'PUT', 'DELETE', 'PATCH'],
  exemptRoutes: ['/api/auth/login', '/api/auth/register'],
  errorMessage: 'CSRF token validation failed'
}

/**
 * CSRF Middleware function
 */
export function withCSRFProtection(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: CSRFMiddlewareOptions = {}
) {
  const config = { ...DEFAULT_OPTIONS, ...options }

  return async (request: NextRequest): Promise<NextResponse> => {
    const { pathname } = request.nextUrl
    const { method } = request

    // Check if route is exempt
    if (config.exemptRoutes?.some(route => pathname.startsWith(route))) {
      return handler(request)
    }

    // Check if method requires CSRF protection
    if (config.protectedMethods?.includes(method)) {
      const csrfToken = request.headers.get('x-csrf-token')
      const cookieToken = request.headers.get('cookie')?.match(/csrf-token=([^;]+)/)?.[1]

      if (!csrfToken || !cookieToken) {
        return NextResponse.json(
          { error: config.errorMessage, code: 'CSRF_TOKEN_MISSING' },
          { status: 403 }
        )
      }

      // Basic token validation - tokens should match
      if (csrfToken !== cookieToken) {
        return NextResponse.json(
          { error: config.errorMessage, code: 'CSRF_TOKEN_INVALID' },
          { status: 403 }
        )
      }
    }

    return handler(request)
  }
}

/**
 * CSRF Token Generator for forms
 */
export function generateCSRFToken(): { token: string; cookie: string } {
  const token = randomBytes(32).toString('hex')
  
  return {
    token,
    cookie: `csrf-token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/`
  }
}

/**
 * Validate CSRF token from form submission
 */
export function validateFormCSRFToken(formToken: string, cookieToken: string): boolean {
  return formToken === cookieToken
}

/**
 * Set CSRF cookie in response
 */
export function setCSRFCookie(response: NextResponse): NextResponse {
  const token = randomBytes(32).toString('hex')
  
  response.cookies.set('csrf-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 24 * 60 * 60 // 24 hours
  })

  return response
}
