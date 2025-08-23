import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { year } = await request.json()
    const currentYear = year || new Date().getFullYear()

    // Reset all TermState visibility fields to DRAFT for the specified year
    const result = await prisma.termState.updateMany({
      where: {
        year: currentYear
      },
      data: {
        startTermVisibility: 'DRAFT',
        endTermVisibility: 'DRAFT',
        visibility: 'DRAFT'
        // Note: We don't change activeTerm, just reset visibility
      }
    })

    

    return NextResponse.json({ 
      message: `Successfully reset visibility for ${result.count} TermState records`,
      resetCount: result.count,
      year: currentYear
    })
  } catch (_error) {
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
