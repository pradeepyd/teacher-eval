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
      const current = await prisma.termState.findUnique({ where: { departmentId } })
      
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
        const updateData: any = { activeTerm }
        if (term === 'START') {
          updateData.startTermVisibility = termVisibility
        } else if (term === 'END') {
          updateData.endTermVisibility = termVisibility
        }

        const updated = await prisma.termState.upsert({
          where: { departmentId },
          update: updateData,
          create: { 
            departmentId, 
            activeTerm,
            startTermVisibility: term === 'START' ? termVisibility : 'DRAFT',
            endTermVisibility: term === 'END' ? termVisibility : 'DRAFT',
            hodVisibility: hodVisibility || 'DRAFT' 
          } as any
        })
        return NextResponse.json(updated)
      }

      // Fallback to old logic for backward compatibility
      // If already published for this active term, block re-publish
      if (current && current.visibility === 'PUBLISHED' && current.activeTerm === activeTerm && visibility === 'PUBLISHED') {
        return NextResponse.json({ error: 'This term has already been published for this department' }, { status: 400 })
      }

      // Enforce: cannot publish teacher evaluation without an existing Term linked to this department for the target term
      // HOD evaluation publishing doesn't require term existence check
      if (visibility === 'PUBLISHED') {
        const termExists = await prisma.term.findFirst({
          where: {
            status: activeTerm as any,
            departments: { some: { id: departmentId } },
          },
          select: { id: true },
        })
        if (!termExists) {
          return NextResponse.json({
            error: 'Create a Term and assign this department to it (with matching START/END status) before publishing teacher evaluations.',
          }, { status: 400 })
        }
      }

      // If Admin switches activeTerm but doesn't specify visibility, reset visibility to DRAFT for the new term
      let nextVisibility = visibility
      if (current && current.activeTerm !== activeTerm && !visibility) {
        nextVisibility = 'DRAFT'
      }

      const termState = await prisma.termState.upsert({
        where: { departmentId },
        update: { activeTerm, ...(nextVisibility ? { visibility: nextVisibility } : {}), ...(hodVisibility ? { hodVisibility } : {}) },
        create: { departmentId, activeTerm, visibility: nextVisibility || 'DRAFT', hodVisibility: hodVisibility || 'DRAFT' }
      })
      return NextResponse.json(termState)
    }

    if (role === 'HOD') {
      if (sessionDeptId !== departmentId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Read current state
      const current = await prisma.termState.findUnique({ where: { departmentId } })
      
      // Handle new term-specific publishing
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
          where: { departmentId },
          update: updateData,
          create: { 
            departmentId, 
            activeTerm: (activeTerm as any) || 'START', 
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
        where: { departmentId },
        update: { ...(visibility ? { visibility } : {}), ...(hodVisibility ? { hodVisibility } : {}) },
        create: { departmentId, activeTerm: (activeTerm as any) || 'START', visibility: visibility || 'DRAFT', hodVisibility: hodVisibility || 'DRAFT' }
      })
      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    
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
        departmentId: departmentId
      },
      include: {
        department: true
      }
    })

    if (!termState) {
      // Fallback: derive from current terms and create if needed
      const activeTerm = await prisma.term.findFirst({
        where: {
          OR: [
            { status: 'START' },
            { status: 'END' }
          ],
          departments: { some: { id: departmentId } }
        },
        orderBy: { updatedAt: 'desc' }
      })

      if (activeTerm) {
        termState = await prisma.termState.upsert({
          where: { departmentId },
          update: { activeTerm: activeTerm.status as any },
          create: { departmentId, activeTerm: activeTerm.status as any },
          include: { department: true }
        })
      } else {
        return NextResponse.json({ departmentId, activeTerm: null }, { status: 200 })
      }
    }

    return NextResponse.json(termState)
  } catch (error) {
    console.error('Error fetching term state:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}