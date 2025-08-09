import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

  // Public routes that don't require authentication
  if (pathname === '/login') {
      // If already authenticated, send user to their dashboard by role
      if (token?.role) {
        const role = token.role as string
        const target = role === 'TEACHER' ? '/dashboard/teacher'
          : role === 'HOD' ? '/dashboard/hod'
          : role === 'ASST_DEAN' ? '/dashboard/asst-dean'
          : role === 'DEAN' ? '/dashboard/dean'
          : role === 'ADMIN' ? '/admin'
          : '/dashboard'
        return NextResponse.redirect(new URL(target, req.url))
      }
      return NextResponse.next()
    }

  // If no token, redirect to login (and redirect base path to login)
  if (!token) {
    const target = pathname === '/' ? '/login' : '/login'
    return NextResponse.redirect(new URL(target, req.url))
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

    // Redirect users to their appropriate dashboard if they access generic / or /dashboard
    if (pathname === '/' || pathname === '/dashboard') {
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
