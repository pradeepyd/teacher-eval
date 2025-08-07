import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const department = await prisma.department.findUnique({
      where: { id: params.id },
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name } = await request.json()

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 })
    }

    const department = await prisma.department.update({
      where: { id: params.id },
      data: {
        name: name.trim()
      }
    })

    return NextResponse.json(department)
  } catch (error) {
    console.error('Error updating department:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if department has users
    const department = await prisma.department.findUnique({
      where: { id: params.id },
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
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Department deleted successfully' })
  } catch (error) {
    console.error('Error deleting department:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
