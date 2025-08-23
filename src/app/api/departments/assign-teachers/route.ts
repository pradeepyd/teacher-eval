import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { createSuccessResponse, createApiErrorResponse, createUnauthorizedResponse } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return createUnauthorizedResponse()
    }

    const { departmentId, teacherIds } = await request.json()

    if (!departmentId || !Array.isArray(teacherIds)) {
      return createApiErrorResponse(
        new Error('Department ID and teacher IDs array are required'),
        { operation: 'assign teachers', component: 'DepartmentsAPI' },
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
        { operation: 'assign teachers', component: 'DepartmentsAPI' },
        404
      )
    }

    // Check if all users exist and are teachers
    const users = await prisma.user.findMany({
      where: { 
        id: { in: teacherIds },
        role: 'TEACHER'
      }
    })

    if (users.length !== teacherIds.length) {
      return createApiErrorResponse(
        new Error('Some users not found or do not have TEACHER role'),
        { operation: 'assign teachers', component: 'DepartmentsAPI' },
        400
      )
    }

    // Update all teachers to assign them to the department
    await prisma.user.updateMany({
      where: { id: { in: teacherIds } },
      data: { departmentId }
    })

    // Invalidate cache to refresh admin data
    revalidatePath('/admin')
    revalidatePath('/admin/departments')

    return createSuccessResponse({ message: 'Teachers assigned successfully' })
  } catch (error) {
    console.error('Error assigning teachers:', error)
    return createApiErrorResponse(error, {
      operation: 'assign teachers',
      component: 'DepartmentsAPI'
    })
  }
}
