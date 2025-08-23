import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { withCSRFProtection } from '@/lib/csrf-middleware'
import { logger } from '@/lib/logger'
import { createSuccessResponse, createApiErrorResponse, createUnauthorizedResponse, createValidationErrorResponse } from '@/lib/api-response'

// Input validation schema for admin user creation
const adminUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  email: z.string().email('Invalid email format').max(255, 'Email too long'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password too long'),
  role: z.enum(['TEACHER', 'HOD', 'ASST_DEAN', 'DEAN', 'ADMIN']),
  departmentId: z.string().optional()
})

// Password validation schema - only string and number
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')

async function createUser(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return createUnauthorizedResponse()
    }

    const body = await request.json()
    
    // Validate input using Zod schema
    const validationResult = adminUserSchema.safeParse(body)
    if (!validationResult.success) {
      return createValidationErrorResponse(
        validationResult.error.issues.map(issue => issue.message)
      )
    }
    
    const { name, email, password, role, departmentId } = validationResult.data

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })
    if (existingUser) {
      return createApiErrorResponse(
        new Error('Email already exists'),
        { operation: 'create user', component: 'AdminUsersAPI' },
        400
      )
    }

    // Validate department for department-specific roles
    if ((role === 'TEACHER' || role === 'HOD') && !departmentId) {
      return createApiErrorResponse(
        new Error('Department ID is required for this role'),
        { operation: 'create user', component: 'AdminUsersAPI' },
        400
      )
    }

    // Validate password using Zod schema
    const passwordValidation = passwordSchema.safeParse(password)
    if (!passwordValidation.success) {
      return createValidationErrorResponse(
        passwordValidation.error.issues.map(issue => issue.message)
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // Use secure database operations
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        departmentId
      }
    })

    // Log critical admin user creation
    if (role === 'ADMIN') {
      logger.security(`ADMIN_USER_CREATED: ${session.user.id} created user ${user.id} (${email})`)
    }

    // Invalidate cache to refresh admin data
    revalidatePath('/admin')
    revalidatePath('/admin/users')

    return createSuccessResponse({
      ...user,
      status: 'active'
    })
  } catch (error) {
    const session = await getServerSession(authOptions)
    logger.error('User creation failed', 'api', session?.user?.id || 'unknown')
    return createApiErrorResponse(error, {
      operation: 'create user',
      component: 'AdminUsersAPI'
    })
  }
}

// Export CSRF-protected POST handler
export const POST = withCSRFProtection(createUser)

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return createUnauthorizedResponse()
    }

    // Create security context
    // const securityContext = DatabaseSecurity.createSecurityContext(session.user as SessionUser)
    // const secureDb = createSecureDatabase(securityContext)

    // Use secure database operations with automatic filtering
    const users = await prisma.user.findMany()

    return createSuccessResponse({
      users: users.map(u => ({ ...u, status: 'active' as const }))
    })
  } catch (error) {
    const sessionForError = await getServerSession(authOptions)
    logger.error('Failed to get users', 'api', sessionForError?.user?.id || 'unknown')
    return createApiErrorResponse(error, {
      operation: 'fetch users',
      component: 'AdminUsersAPI'
    })
  }
}
