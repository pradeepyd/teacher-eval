import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: any
) {
  try {
    const session: any = await getServerSession(authOptions as any)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if term exists
    const term = await prisma.term.findUnique({
      where: { id: params.id },
      include: {
        departments: true
      }
    })

    if (!term) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 })
    }

    if (term.status !== 'START') {
      return NextResponse.json({ error: 'Term is not active' }, { status: 400 })
    }

    // End the term and update department term states
    await prisma.$transaction(async (tx) => {
      // Update term status
      await tx.term.update({
        where: { id: params.id },
        data: { status: 'END' }
      })

      // Update department term states
      for (const department of term.departments) {
        await tx.termState.upsert({
          where: { departmentId: department.id },
          update: { activeTerm: 'END' },
          create: {
            departmentId: department.id,
            activeTerm: 'END'
          }
        })
      }
    })

    return NextResponse.json({ message: 'Term ended successfully' })
  } catch (error) {
    console.error('Error ending term:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
