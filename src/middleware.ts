import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // Public routes that don't require authentication
    if (pathname === '/login' || pathname === '/') {
      return NextResponse.next()
    }

    // If no token, redirect to login
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    const userRole = token.role as string

    // Role-based route protection
    if (pathname.startsWith('/dashboard/teacher') && userRole !== 'TEACHER') {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    if (pathname.startsWith('/dashboard/hod') && userRole !== 'HOD') {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    if (pathname.startsWith('/dashboard/asst-dean') && userRole !== 'ASST_DEAN') {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    if (pathname.startsWith('/dashboard/dean') && userRole !== 'DEAN') {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    if (pathname.startsWith('/admin') && userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    // Redirect users to their appropriate dashboard if they access generic /dashboard
    if (pathname === '/dashboard') {
      switch (userRole) {
        case 'TEACHER':
          return NextResponse.redirect(new URL('/dashboard/teacher', req.url))
        case 'HOD':
          return NextResponse.redirect(new URL('/dashboard/hod', req.url))
        case 'ASST_DEAN':
          return NextResponse.redirect(new URL('/dashboard/asst-dean', req.url))
        case 'DEAN':
          return NextResponse.redirect(new URL('/dashboard/dean', req.url))
        case 'ADMIN':
          return NextResponse.redirect(new URL('/admin', req.url))
        default:
          return NextResponse.redirect(new URL('/login', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    }
  }
)

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login|unauthorized).*)'
  ]
}