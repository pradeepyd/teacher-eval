import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const departments = await prisma.department.findMany({
      include: {
        termStates: true,
        users: {
          where: { role: 'HOD' },
          select: { id: true, name: true }
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
      termStates: d.termStates
    }))

    return NextResponse.json({ departments: departmentsWithHod })
  } catch (error) {
    console.error('Error fetching departments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 })
    }

    const trimmedName = name.trim()

    // Check if department already exists
    const existingDepartment = await prisma.department.findUnique({
      where: { name: trimmedName }
    })

    if (existingDepartment) {
      return NextResponse.json({ error: 'Department with this name already exists' }, { status: 400 })
    }

    const department = await prisma.department.create({
      data: {
        name: trimmedName
      }
    })

    return NextResponse.json(department, { status: 201 })
  } catch (error) {
    console.error('Error creating department:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
