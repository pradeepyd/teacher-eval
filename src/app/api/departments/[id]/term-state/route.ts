import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { activeTerm, visibility } = await request.json()
    const resolved = 'then' in (context.params as any) ? await (context.params as Promise<{ id: string }>) : (context.params as { id: string })
    const departmentId = resolved.id

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
    // Authorization logic:
    // - ADMIN: can change activeTerm and visibility
    // - HOD: can ONLY change visibility for their own department
    const role = (session.user as any).role
    const sessionDeptId = (session.user as any).departmentId

    if (role === 'ADMIN') {
      // If already published for this active term, block re-publish
      const current = await prisma.termState.findUnique({ where: { departmentId } })
      if (current && current.visibility === 'PUBLISHED' && current.activeTerm === activeTerm && visibility === 'PUBLISHED') {
        return NextResponse.json({ error: 'This term has already been published for this department' }, { status: 400 })
      }
      const termState = await prisma.termState.upsert({
        where: { departmentId },
        update: { activeTerm, ...(visibility ? { visibility } : {}) },
        create: { departmentId, activeTerm, visibility: visibility || 'DRAFT' }
      })
      return NextResponse.json(termState)
    }

    if (role === 'HOD') {
      if (sessionDeptId !== departmentId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Read current state and update ONLY visibility
      const current = await prisma.termState.findUnique({ where: { departmentId } })
      if (!current && !visibility) {
        return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
      }
      // If already published for the current active term, block re-publish
      if (current && current.visibility === 'PUBLISHED' && visibility === 'PUBLISHED') {
        return NextResponse.json({ error: 'Already published for this term' }, { status: 400 })
      }
      const updated = await prisma.termState.upsert({
        where: { departmentId },
        update: { ...(visibility ? { visibility } : {}) },
        create: { departmentId, activeTerm: (activeTerm as any) || 'START', visibility: visibility || 'DRAFT' }
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
  request: NextRequest,
  context: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolved = 'then' in (context.params as any) ? await (context.params as Promise<{ id: string }>) : (context.params as { id: string })
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
          create: { departmentId, activeTerm: activeTerm.status as any }
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