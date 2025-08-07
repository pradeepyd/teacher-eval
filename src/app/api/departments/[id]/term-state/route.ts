import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
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

    const { activeTerm } = await request.json()
    const departmentId = params.id

    if (!activeTerm || !['START', 'END'].includes(activeTerm)) {
      return NextResponse.json({ error: 'Valid active term is required (START or END)' }, { status: 400 })
    }

    // Check if department exists
    const department = await prisma.department.findUnique({
      where: { id: departmentId }
    })

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    // Update or create term state
    const termState = await prisma.termState.upsert({
      where: {
        departmentId: departmentId
      },
      update: {
        activeTerm: activeTerm
      },
      create: {
        departmentId: departmentId,
        activeTerm: activeTerm
      }
    })

    return NextResponse.json(termState)
  } catch (error) {
    console.error('Error updating term state:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const departmentId = params.id

    const termState = await prisma.termState.findUnique({
      where: {
        departmentId: departmentId
      },
      include: {
        department: true
      }
    })

    if (!termState) {
      return NextResponse.json({ error: 'Term state not found' }, { status: 404 })
    }

    return NextResponse.json(termState)
  } catch (error) {
    console.error('Error fetching term state:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}