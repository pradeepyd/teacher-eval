import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Update Dean and Assistant Dean to have no department (institution-wide)
    const updatedUsers = await prisma.user.updateMany({
      where: {
        OR: [
          { email: 'dean@example.com' },
          { email: 'asstdean@example.com' }
        ]
      },
      data: {
        departmentId: null
      }
    })

    // Get all users to show current state
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentId: true
      }
    })

    return NextResponse.json({ 
      message: 'Users updated successfully',
      updatedCount: updatedUsers.count,
      users: allUsers
    })
  } catch (error) {
    console.error('Error updating users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
