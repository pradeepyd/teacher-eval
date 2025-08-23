import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { createSuccessResponse, createApiErrorResponse, createUnauthorizedResponse } from '@/lib/api-response'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: departmentId } = await params
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return createUnauthorizedResponse()
    }

    const { hodId } = await request.json()

    if (!hodId) {
      return createApiErrorResponse(
        new Error('HOD ID is required'),
        { operation: 'assign HOD', component: 'DepartmentsAPI' },
        400
      )
    }

    // Check if department exists
    const department = await prisma.department.findUnique({
      where: { id: departmentId }
    })

    if (!department) {
      return createApiErrorResponse(
        new Error('Department not found'),
        { operation: 'assign HOD', component: 'DepartmentsAPI' },
        404
      )
    }

    // Check if user exists and is an HOD
    const user = await prisma.user.findUnique({
      where: { id: hodId }
    })

    if (!user) {
      return createApiErrorResponse(
        new Error('User not found'),
        { operation: 'assign HOD', component: 'DepartmentsAPI' },
        404
      )
    }

    if (user.role !== 'HOD') {
      return createApiErrorResponse(
        new Error('User must have HOD role'),
        { operation: 'assign HOD', component: 'DepartmentsAPI' },
        400
      )
    }

    // Update the user's department
    await prisma.user.update({
      where: { id: hodId },
      data: { departmentId }
    })

    // Invalidate cache to refresh admin data
    revalidatePath('/admin')
    revalidatePath('/admin/departments')

    return createSuccessResponse({ message: 'HOD assigned successfully' })
  } catch (error) {
    const sessionForError = await getServerSession(authOptions)
    console.error('Error assigning HOD:', error)
    return createApiErrorResponse(error, {
      operation: 'assign HOD',
      component: 'DepartmentsAPI'
    })
  }
}
