import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { createSuccessResponse, createApiErrorResponse, createUnauthorizedResponse, createValidationErrorResponse } from '@/lib/api-response'

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return createUnauthorizedResponse()
    }

    const departments = await prisma.department.findMany({
      include: {
        termStates: true,
        users: {
          where: { role: 'HOD' },
          select: { id: true, name: true }
        },
        _count: {
          select: {
            users: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    const departmentsWithHod = departments.map(d => ({
      id: d.id,
      name: d.name,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      hod: d.users[0] ? { id: d.users[0].id, name: d.users[0].name } : null,
      termStates: d.termStates,
      _count: d._count
    }))

    return createSuccessResponse({ departments: departmentsWithHod })
  } catch (error) {
    console.error('Error fetching departments:', error)
    return createApiErrorResponse(error, {
      operation: 'fetch departments',
      component: 'DepartmentsAPI'
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return createUnauthorizedResponse()
    }

    const { name } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return createValidationErrorResponse(['Department name is required'])
    }

    const trimmedName = name.trim()

    // Check if department already exists
    const existingDepartment = await prisma.department.findUnique({
      where: { name: trimmedName }
    })

    if (existingDepartment) {
      return createApiErrorResponse(
        new Error('Department with this name already exists'),
        { operation: 'create department', component: 'DepartmentsAPI' },
        400
      )
    }

    const department = await prisma.department.create({
      data: {
        name: trimmedName
      }
    })

    // Invalidate cache to refresh admin data
    revalidatePath('/admin')
    revalidatePath('/admin/departments')

    return createSuccessResponse(department, 201)
  } catch (error) {
    console.error('Error creating department:', error)
    return createApiErrorResponse(error, {
      operation: 'create department',
      component: 'DepartmentsAPI'
    })
  }
}
