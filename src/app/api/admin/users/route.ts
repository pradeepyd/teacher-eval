import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'
import { z } from 'zod'

// Password validation schema
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[0-9]/, 'Password must contain at least one number')

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, email, password, role, departmentId } = await request.json()

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate role
    const VALID_ROLES = ['TEACHER', 'HOD', 'ASST_DEAN', 'DEAN', 'ADMIN'] as const
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })
    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }

    // Validate department for department-specific roles
    if ((role === 'TEACHER' || role === 'HOD') && !departmentId) {
      return NextResponse.json({ error: 'Department ID is required for this role' }, { status: 400 })
    }

    // Validate password using Zod schema
    const passwordValidation = passwordSchema.safeParse(password)
    if (!passwordValidation.success) {
      return NextResponse.json({ 
        error: 'Password validation failed',
        details: passwordValidation.error.issues.map(issue => issue.message)
      }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        // Use relation connect per Prisma docs
        department: (role === 'ADMIN' || role === 'DEAN' || role === 'ASST_DEAN' || !departmentId)
          ? undefined
          : { connect: { id: departmentId } },
        emailVerified: null
      },
      include: {
        department: true
      }
    })

    // Log admin user creation
    if (role === 'ADMIN') {

    }

    return NextResponse.json({
      ...user,
      status: 'active'
    })
  } catch (error) {
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const departmentId = searchParams.get('departmentId') || undefined
    const role = searchParams.get('role') || undefined

    const users = await prisma.user.findMany({
      where: {
        ...(departmentId ? { departmentId } : {}),
        ...(role ? { role: role as any } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        department: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      users: users.map(u => ({ ...u, status: 'active' as const }))
    })
  } catch (error) {
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
