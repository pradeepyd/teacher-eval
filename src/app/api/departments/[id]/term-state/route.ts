import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { activeTerm, visibility, hodVisibility, term, termVisibility } = await request.json()
    const resolved = await params
    const departmentId = resolved.id

    if (!activeTerm || !['START', 'END'].includes(activeTerm)) {
      return NextResponse.json({ error: 'Valid active term is required (START or END)' }, { status: 400 })
    }

    // Handle new term-specific publishing
    if (term && termVisibility) {
      if (!['START', 'END'].includes(term)) {
        return NextResponse.json({ error: 'Valid term is required (START or END) for publishing' }, { status: 400 })
      }
      if (!['DRAFT', 'PUBLISHED'].includes(termVisibility)) {
        return NextResponse.json({ error: 'Valid visibility is required (DRAFT or PUBLISHED)' }, { status: 400 })
      }
    }

    // Check if department exists
    const department = await prisma.department.findUnique({
      where: { id: departmentId }
    })

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    // Update or create term state
    // Authorization logic:
    // - ADMIN: can change activeTerm and visibility
    // - HOD: can ONLY change visibility for their own department
    const role = (session.user as any).role
    const sessionDeptId = (session.user as any).departmentId

    if (role === 'ADMIN') {
      const currentYear = new Date().getFullYear()
      const current = await prisma.termState.findUnique({ 
        where: { 
          departmentId_year: {
            departmentId,
            year: currentYear
          }
        } 
      })
      
      // Handle new term-specific publishing for ADMIN
      if (term && termVisibility) {
        // Check if already published for this specific term
        const fieldToCheck = term === 'START' ? 'startTermVisibility' : 'endTermVisibility'
        if (current && (current as any)[fieldToCheck] === 'PUBLISHED' && termVisibility === 'PUBLISHED') {
          return NextResponse.json({ error: `Already published for ${term} term` }, { status: 400 })
        }

        // Enforce term existence when attempting to publish
        if (termVisibility === 'PUBLISHED') {
          const termExists = await prisma.term.findFirst({
            where: {
              status: term as any,
              year: currentYear,
              departments: { some: { id: departmentId } },
            },
            select: { id: true },
          })
          if (!termExists) {
            return NextResponse.json({
              error: `Create a Term and assign this department (matching ${term}) before publishing evaluations.`,
            }, { status: 400 })
          }
        }

        // Update the specific term visibility
        const updateData: any = {}
        if (term === 'START') {
          updateData.startTermVisibility = termVisibility
        } else if (term === 'END') {
          updateData.endTermVisibility = termVisibility
        }

        const updated = await prisma.termState.upsert({
          where: { 
            departmentId_year: {
              departmentId,
              year: currentYear
            }
          },
          update: updateData,
          create: { 
            departmentId, 
            activeTerm,
            year: currentYear,
            startTermVisibility: term === 'START' ? termVisibility : 'DRAFT',
            endTermVisibility: term === 'END' ? termVisibility : 'DRAFT',
            hodVisibility: hodVisibility || 'DRAFT' 
          } as any
        })
        return NextResponse.json(updated)
      }

      // Fallback to old visibility logic for backward compatibility
      if (!current && !visibility) {
        return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
      }
      // If already published for the current active term, block re-publish
      if (current && current.visibility === 'PUBLISHED' && visibility === 'PUBLISHED') {
        return NextResponse.json({ error: 'Already published for this term' }, { status: 400 })
      }

      // Enforce term existence when attempting to publish
      if (visibility === 'PUBLISHED') {
        const effectiveTerm = (current?.activeTerm || activeTerm) as any
        const termExists = await prisma.term.findFirst({
          where: {
            status: effectiveTerm,
            year: currentYear,
            departments: { some: { id: departmentId } },
          },
          select: { id: true },
        })
        if (!termExists) {
          return NextResponse.json({
            error: 'Create a Term and assign this department (matching START/END) before publishing evaluations.',
          }, { status: 400 })
        }
      }
      const updated = await prisma.termState.upsert({
        where: { 
          departmentId_year: {
            departmentId,
            year: currentYear
          }
        },
        update: { ...(visibility ? { visibility } : {}), ...(hodVisibility ? { hodVisibility } : {}) },
        create: { 
          departmentId, 
          activeTerm: (activeTerm as any) || 'START', 
          year: currentYear,
          visibility: visibility || 'DRAFT', 
          hodVisibility: hodVisibility || 'DRAFT' 
        }
      })
      return NextResponse.json(updated)
    }

    if (role === 'HOD') {
      if (sessionDeptId !== departmentId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const currentYear = new Date().getFullYear()
      // Read current state
      const current = await prisma.termState.findUnique({ 
        where: { 
          departmentId_year: {
            departmentId,
            year: currentYear
          }
        } 
      })
      
      // HOD can only change visibility, not activeTerm
      if (visibility) {
        const updated = await prisma.termState.upsert({
          where: { 
            departmentId_year: {
              departmentId,
              year: currentYear
            }
          },
          update: { visibility },
          create: { 
            departmentId, 
            activeTerm: (activeTerm as any) || 'START', 
            year: currentYear,
            visibility: visibility || 'DRAFT', 
            hodVisibility: hodVisibility || 'DRAFT' 
          }
        })
        return NextResponse.json(updated)
      }

      if (hodVisibility) {
        const updated = await prisma.termState.upsert({
          where: { 
            departmentId_year: {
              departmentId,
              year: currentYear
            }
          },
          update: { hodVisibility },
          create: { 
            departmentId, 
            activeTerm: (activeTerm as any) || 'START', 
            year: currentYear,
            visibility: visibility || 'DRAFT', 
            hodVisibility: hodVisibility || 'DRAFT' 
          }
        })
        return NextResponse.json(updated)
      }

      return NextResponse.json(current)
    }

    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  } catch (error) {
    console.error('Error updating term state:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolved = await params
    const departmentId = resolved.id

    let termState = await prisma.termState.findUnique({
      where: {
        departmentId_year: {
          departmentId,
          year: new Date().getFullYear()
        }
      },
      include: {
        department: true
      }
    })

    if (!termState) {
      // Fallback: derive from current terms and create if needed
      const currentYear = new Date().getFullYear()
      const activeTerm = await prisma.term.findFirst({
        where: {
          OR: [
            { status: 'START' },
            { status: 'END' }
          ],
          year: currentYear,
          departments: { some: { id: departmentId } }
        },
        orderBy: { updatedAt: 'desc' }
      })

      if (activeTerm) {
        console.log(`Creating missing TermState for department ${departmentId} with active term: ${activeTerm.status} for year ${currentYear}`)
        termState = await prisma.termState.upsert({
          where: { 
            departmentId_year: {
              departmentId,
              year: currentYear
            }
          },
          update: { activeTerm: activeTerm.status as any },
          create: {
            departmentId,
            year: currentYear,
            activeTerm: activeTerm.status as any,
            visibility: 'DRAFT',
            hodVisibility: 'DRAFT',
            startTermVisibility: 'DRAFT',
            endTermVisibility: 'DRAFT'
          },
          include: { department: true }
        })
        console.log(`Successfully created TermState for department ${departmentId} for year ${currentYear}:`, termState)
      } else {
        console.log(`No active terms found for department ${departmentId} for year ${currentYear}`)
        return NextResponse.json({ departmentId, activeTerm: null, year: currentYear }, { status: 200 })
      }
    }

    return NextResponse.json(termState)
  } catch (error) {
    console.error('Error fetching term state:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}