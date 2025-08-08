import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const terms = await prisma.term.findMany({
      include: {
        departments: {
          include: {
            termState: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ terms })
  } catch (error) {
    console.error('Error fetching terms:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
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

    // Create term with department associations
    const term = await prisma.term.create({
      data: {
        name,
        year: yearNumber,
        startDate: start,
        endDate: end,
        status: 'INACTIVE',
        departments: {
          connect: Array.isArray(departmentIds) ? departmentIds.map((id: string) => ({ id })) : []
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
    console.error('Error creating term:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
