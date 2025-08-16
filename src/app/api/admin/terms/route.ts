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

    const terms = await prisma.term.findMany({
      include: {
        departments: {
          include: {
            termStates: true
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

    const { name, year, startDate, endDate, termType, departmentIds } = await request.json()

    if (!name || !year || !startDate || !endDate || !termType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['START', 'END'].includes(termType)) {
      return NextResponse.json({ error: 'Invalid term type. Must be START or END' }, { status: 400 })
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

    // Check if a term of the same type already exists for the same departments and year
    if (Array.isArray(departmentIds) && departmentIds.length > 0) {
      for (const deptId of departmentIds) {
        // Check if there's already a Term with the same type for this department and year
        const existingTerm = await prisma.term.findFirst({
          where: {
            year: yearNumber,
            status: termType,
            departments: {
              some: {
                id: deptId
              }
            }
          }
        })

        if (existingTerm) {
          return NextResponse.json({ 
            error: `A ${termType} term already exists for department ${deptId} in year ${yearNumber}. Please complete the existing term before creating a new one.` 
          }, { status: 400 })
        }
      }
    }

    // Create term with department associations
    // Terms are created directly with their intended status (START or END)
    const term = await prisma.term.create({
      data: {
        name,
        year: yearNumber,
        startDate: start,
        endDate: end,
        status: termType as 'START' | 'END', // Create directly as START or END
        departments: {
          connect: Array.isArray(departmentIds) ? departmentIds.map((id: string) => ({ id })) : []
        }
      },
      include: {
        departments: {
          include: {
            termStates: true
          }
        }
      }
    })

    // Auto-set department term states for connected departments (YEAR-WISE)
    if (Array.isArray(departmentIds) && departmentIds.length > 0) {
      console.log(`Setting up automatic year-wise term mapping for ${departmentIds.length} departments...`)
      
      for (const deptId of departmentIds) {
        // Create or update the term state for the specific year and term
        const termState = await prisma.termState.upsert({
          where: { 
            departmentId_year: {
              departmentId: deptId,
              year: yearNumber
            }
          },
          update: { 
            activeTerm: termType as 'START' | 'END',
            // Set the appropriate term visibility to DRAFT
            ...(termType === 'START' ? { 
              startTermVisibility: 'DRAFT',
              // Keep END term visibility as is (don't reset)
            } : { 
              endTermVisibility: 'DRAFT',
              // Keep START term visibility as is (don't reset)
            })
          },
          create: {
            departmentId: deptId,
            year: yearNumber,
            activeTerm: termType as 'START' | 'END',
            visibility: 'DRAFT',
            hodVisibility: 'DRAFT',
            startTermVisibility: 'DRAFT',
            endTermVisibility: 'DRAFT'
          }
        })

        console.log(`✅ Department ${deptId} now has active term: ${termType} for year ${yearNumber}`)
      }
      
      console.log(`🎯 Year-wise automatic term mapping complete! ${departmentIds.length} departments now have ${termType} as active term for year ${yearNumber}`)
    }

    return NextResponse.json(term)
  } catch (error) {
    console.error('Error creating term:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
