import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolved = await params
    const department = await prisma.department.findUnique({
      where: { id: resolved.id },
      include: {
        termState: true,
        _count: {
          select: {
            users: true
          }
        }
      }
    })

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    return NextResponse.json(department)
  } catch (error) {
    console.error('Error fetching department:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, hodId, teacherIds } = await request.json()

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 })
    }

    const trimmedName = name.trim()

    const resolved = await params
    const result = await prisma.$transaction(async (tx) => {
      // Update department name
      const department = await tx.department.update({
        where: { id: resolved.id },
        data: { name: trimmedName }
      })

      // Reassign or promote HOD if provided
      if (hodId) {
        // Clear any existing HOD in this department
        await tx.user.updateMany({
          where: { departmentId: resolved.id, role: 'HOD' },
          data: { departmentId: null }
        })
        // Assign selected user to this department and ensure role is HOD
        await tx.user.update({
          where: { id: hodId },
          data: { departmentId: resolved.id, role: 'HOD' as any }
        })
      }

      // Assign teachers if provided (only assign teachers without department)
      if (Array.isArray(teacherIds)) {
        await tx.user.updateMany({
          where: { id: { in: teacherIds }, role: 'TEACHER' },
          data: { departmentId: resolved.id }
        })
      }

      return department
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error updating department:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if department has users
    const resolved = await params
    const department = await prisma.department.findUnique({
      where: { id: resolved.id },
      include: {
        _count: {
          select: {
            users: true
          }
        }
      }
    })

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    if (department._count.users > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete department with existing users. Please reassign or delete users first.' 
      }, { status: 400 })
    }

    await prisma.department.delete({
      where: { id: resolved.id }
    })

    return NextResponse.json({ message: 'Department deleted successfully' })
  } catch (error) {
    console.error('Error deleting department:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
