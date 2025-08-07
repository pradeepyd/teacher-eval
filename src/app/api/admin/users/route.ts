import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, email, password, role, departmentId, adminSecret } = await request.json()

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

    // Validate department for non-admin roles
    if (role !== 'ADMIN' && !departmentId) {
      return NextResponse.json({ error: 'Department ID is required for non-admin roles' }, { status: 400 })
    }

    // Simple password validation
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        departmentId,
        emailVerified: role === 'ADMIN' ? false : null // Admin accounts need verification
      },
      include: {
        department: true
      }
    })

    // Log admin user creation
    if (role === 'ADMIN') {
      console.log(`New admin user created: ${email} by ${session.user.email} at ${new Date().toISOString()}`)
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
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

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
