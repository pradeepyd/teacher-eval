import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { logger } from '@/lib/logger'

// Blocked email domains for security
const BLOCKED_DOMAINS = [
  '10minutemail.com', 'guerrillamail.com', 'tempmail.org', 'mailinator.com',
  'throwaway.email', 'temp-mail.org', 'sharklasers.com', 'guerrillamailblock.com'
]

// Input validation schemas
const userRegistrationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email too long')
    .refine((email) => {
      const domain = email.split('@')[1]?.toLowerCase()
      return domain && !BLOCKED_DOMAINS.includes(domain)
    }, 'Temporary email domains are not allowed'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: z.enum(['TEACHER', 'HOD', 'ASST_DEAN', 'DEAN', 'ADMIN']),
  departmentId: z.string().optional(),
  secretCode: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input using Zod schema
    const validationResult = userRegistrationSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid input data',
        details: validationResult.error.issues.map(issue => issue.message)
      }, { status: 400 })
    }
    
    const { name, email, password, role, departmentId, secretCode } = validationResult.data

    // For admin, validate secret code
    if (role === 'ADMIN') {
      const adminSecretCode = process.env.ADMIN_SECRET_CODE
      if (!adminSecretCode || adminSecretCode.trim() === '') {
        logger.error('ADMIN_SECRET_CODE environment variable not set or empty', 'registration', undefined, 'ADMIN_REGISTRATION_CONFIG_ERROR')
        return NextResponse.json({ error: 'Admin registration is not configured' }, { status: 500 })
      }
      if (secretCode !== adminSecretCode) {
        logger.security('ADMIN_REGISTRATION_ATTEMPT_INVALID_SECRET', 'registration', undefined, 'ADMIN_REGISTRATION_ATTEMPT')
        return NextResponse.json({ error: 'Invalid admin secret code' }, { status: 400 })
      }
    }

    // For department-specific roles, validate department
    if ((role === 'TEACHER' || role === 'HOD') && !departmentId) {
      return NextResponse.json({ error: 'Department is required for this role' }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      logger.warn('User registration attempt with existing email', 'registration', undefined, 'DUPLICATE_EMAIL_ATTEMPT')
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
    }

    // For department-specific roles, validate department exists
    if (departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: departmentId }
      })

      if (!department) {
        return NextResponse.json({ error: 'Department not found' }, { status: 400 })
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        departmentId: role === 'ADMIN' || role === 'DEAN' || role === 'ASST_DEAN' ? null : departmentId
      },
      include: {
        department: true
      }
    })

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    // Log successful user creation
    logger.info('User registered successfully', 'registration', user.id, 'USER_CREATED')

    return NextResponse.json({
      message: 'User registered successfully',
      user: userWithoutPassword
    }, { status: 201 })

  } catch (_error) {
    logger.error('User registration failed', 'registration', undefined, 'REGISTRATION_ERROR')
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
