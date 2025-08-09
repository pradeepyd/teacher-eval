import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  try {
    const session: any = await getServerSession(authOptions as any)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if term exists
    const resolved = 'then' in (context.params as any) ? await (context.params as Promise<{ id: string }>) : (context.params as { id: string })
    const term = await prisma.term.findUnique({
      where: { id: resolved.id },
      include: {
        departments: true
      }
    })

    if (!term) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 })
    }

    if (term.status !== 'INACTIVE') {
      return NextResponse.json({ error: 'Term is already active or completed' }, { status: 400 })
    }

    // Start the term and update department term states
    await prisma.$transaction(async (tx) => {
      // Update term status
      await tx.term.update({
        where: { id: resolved.id },
        data: { status: 'START' }
      })

      // Update department term states
      for (const department of term.departments) {
        await tx.termState.upsert({
          where: { departmentId: department.id },
          update: { activeTerm: 'START' },
          create: {
            departmentId: department.id,
            activeTerm: 'START'
          }
        })
      }
    })

    return NextResponse.json({ message: 'Term started successfully' })
  } catch (error) {
    console.error('Error starting term:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
