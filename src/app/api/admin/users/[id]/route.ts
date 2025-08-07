import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, email, role, departmentId } = await request.json()

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

    const user = await prisma.user.update({
      where: { id: params.id },
      data: {
        name,
        email,
        role,
        departmentId: role === 'ADMIN' ? null : departmentId
      },
      include: {
        department: true
      }
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating user:', error)
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
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
