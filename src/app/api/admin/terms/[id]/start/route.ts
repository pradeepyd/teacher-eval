import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session: any = await getServerSession(authOptions as any)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if term exists
    const resolved = await params
    const term = await prisma.term.findUnique({
      where: { id: resolved.id },
      include: {
        departments: true
      }
    })

    if (!term) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 })
    }

    if (term.status !== 'START') {
      return NextResponse.json({ error: 'This is not a START term' }, { status: 400 })
    }

    // Activate the START term and update department term states
    await prisma.$transaction(async (tx) => {
      // Term status remains 'START', we just activate it for departments
      // Update department term states to use this START term
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
