import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
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

    // Validate dates
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (start >= end) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 })
    }

    // Create term with department associations
    const term = await prisma.term.create({
      data: {
        name,
        year: parseInt(year),
        startDate,
        endDate,
        status: 'INACTIVE',
        departments: {
          connect: departmentIds?.map((id: string) => ({ id })) || []
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
