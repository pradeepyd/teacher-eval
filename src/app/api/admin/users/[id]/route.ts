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

export async function PUT(
  request: NextRequest,
  { params }: any
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 400 })
    }

    const { name, email, role, departmentId, password } = await request.json()

    if (!name || !email || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate role
    const VALID_ROLES = ['TEACHER', 'HOD', 'ASST_DEAN', 'DEAN', 'ADMIN'] as const
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Check if email already exists for another user
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        id: { not: params.id }
      }
    })
    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }

    // Validate department for non-admin roles
    if (role !== 'ADMIN' && !departmentId) {
      return NextResponse.json({ error: 'Department ID is required for non-admin roles' }, { status: 400 })
    }

    // Prepare update data
    const updateData: any = {
      name,
      email,
      role,
      departmentId: role === 'ADMIN' ? null : departmentId
    }

    // Hash password if provided
    if (password && password.trim()) {
      // Validate password using Zod schema
      const passwordValidation = passwordSchema.safeParse(password)
      if (!passwordValidation.success) {
        return NextResponse.json({ 
          error: 'Password validation failed',
          details: passwordValidation.error.issues.map(issue => issue.message)
        }, { status: 400 })
      }
      
      const hashedPassword = await bcrypt.hash(password, 12)
      updateData.password = hashedPassword
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      include: {
        department: true
      }
    })

    return NextResponse.json(user)
  } catch (error) {
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: any
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: params.id }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent admin from deleting themselves
    if (user.id === session.user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    // Delete user
    await prisma.user.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
