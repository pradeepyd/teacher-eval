import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import { createSuccessResponse, createApiErrorResponse, createUnauthorizedResponse, createValidationErrorResponse } from '@/lib/api-response'
import type { Prisma } from '@prisma/client'

// Password validation schema
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[0-9]/, 'Password must contain at least one number')

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return createUnauthorizedResponse()
    }

    const { name, email, role, departmentId, password } = await request.json()

    if (!name || !email || !role) {
      return createValidationErrorResponse(['Missing required fields'])
    }

    // Validate role
    const VALID_ROLES = ['TEACHER', 'HOD', 'ASST_DEAN', 'DEAN', 'ADMIN'] as const
    if (!VALID_ROLES.includes(role)) {
      return createValidationErrorResponse(['Invalid role'])
    }

    // Check if email already exists for another user
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        id: { not: id }
      }
    })
    if (existingUser) {
      return createApiErrorResponse(
        new Error('Email already exists'),
        { operation: 'update user', component: 'AdminUsersAPI' },
        400
      )
    }

    // Validate department for non-admin roles
    if (role !== 'ADMIN' && !departmentId) {
      return createValidationErrorResponse(['Department ID is required for non-admin roles'])
    }

    // Prepare update data
    const updateData: Prisma.UserUpdateInput = {
      name,
      email,
      role: role as Prisma.UserUpdateInput['role'],
      department: role === 'ADMIN' ? { disconnect: true } : { connect: { id: departmentId! } }
    }

    // Hash password if provided
    if (password && password.trim()) {
      // Validate password using Zod schema
      const passwordValidation = passwordSchema.safeParse(password)
      if (!passwordValidation.success) {
        return createValidationErrorResponse(
          passwordValidation.error.issues.map(issue => issue.message)
        )
      }
      
      const hashedPassword = await bcrypt.hash(password, 12)
      updateData.password = hashedPassword
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        department: true
      }
    })

    // Invalidate cache to refresh admin data
    revalidatePath('/admin')
    revalidatePath('/admin/users')

    return createSuccessResponse(user)
  } catch (error) {
    const sessionForError = await getServerSession(authOptions)
    logger.error('User update failed', 'api', sessionForError?.user?.id || 'unknown')
    return createApiErrorResponse(error, {
      operation: 'update user',
      component: 'AdminUsersAPI'
    })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return createUnauthorizedResponse()
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id }
    })

    if (!user) {
      return createApiErrorResponse(
        new Error('User not found'),
        { operation: 'delete user', component: 'AdminUsersAPI' },
        404
      )
    }

    // Prevent admin from deleting themselves
    if (user.id === session.user.id) {
      return createApiErrorResponse(
        new Error('Cannot delete your own account'),
        { operation: 'delete user', component: 'AdminUsersAPI' },
        400
      )
    }

    // Delete user
    await prisma.user.delete({
      where: { id }
    })

    // Invalidate cache to refresh admin data
    revalidatePath('/admin')
    revalidatePath('/admin/users')

    return createSuccessResponse({ message: 'User deleted successfully' })
  } catch (error) {
    const sessionForError = await getServerSession(authOptions)
    logger.error('User deletion failed', 'api', sessionForError?.user?.id || 'unknown')
    return createApiErrorResponse(error, {
      operation: 'delete user',
      component: 'AdminUsersAPI'
    })
  }
}
