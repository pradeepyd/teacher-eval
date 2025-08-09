import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session: any = await getServerSession(authOptions as any)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, year, startDate, endDate, departmentIds } = await request.json()

    if (!name || !year || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Coerce and validate dates
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Invalid start or end date' }, { status: 400 })
    }
    
    if (start >= end) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 })
    }

    // Normalize year
    const yearNumber = typeof year === 'string' ? parseInt(year, 10) : year
    if (!Number.isFinite(yearNumber)) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
    }

    // Resolve params per Next.js v15 dynamic API guidance
    const resolvedParams = await params

    // Update term with department associations
    const term = await prisma.term.update({
      where: { id: resolvedParams.id },
      data: {
        name,
        year: yearNumber,
        startDate: start,
        endDate: end,
        departments: {
          set: Array.isArray(departmentIds) ? departmentIds.map((id: string) => ({ id })) : []
        }
      },
      include: {
        departments: {
          include: {
            termState: true
          }
        }
      }
    })

    return NextResponse.json(term)
  } catch (error) {
    console.error('Error updating term:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session: any = await getServerSession(authOptions as any)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve params per Next.js v15 dynamic API guidance
    const resolvedParams = await params

    // Check if term exists
    const term = await prisma.term.findUnique({
      where: { id: resolvedParams.id }
    })

    if (!term) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 })
    }

    // Delete term
    await prisma.term.delete({
      where: { id: resolvedParams.id }
    })

    return NextResponse.json({ message: 'Term deleted successfully' })
  } catch (error) {
    console.error('Error deleting term:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
