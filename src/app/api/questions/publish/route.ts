import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'HOD') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { departmentId, term, year } = await request.json()

    if (!departmentId || !term || !year) {
      return NextResponse.json({ error: 'Department ID, term, and year are required' }, { status: 400 })
    }

    if (!['START', 'END'].includes(term)) {
      return NextResponse.json({ error: 'Invalid term. Must be START or END' }, { status: 400 })
    }

    // Verify the HOD belongs to this department
    if (session.user.departmentId !== departmentId) {
      return NextResponse.json({ error: 'Unauthorized to publish questions for this department' }, { status: 403 })
    }

    // Publish all questions for this department, term, and year
    const result = await prisma.question.updateMany({
      where: {
        departmentId,
        term: term as 'START' | 'END',
        year: parseInt(year),
        isActive: true
      },
      data: {
        isPublished: true
      }
    })

    // Update TermState visibility to PUBLISHED for this term
    await prisma.termState.updateMany({
      where: {
        departmentId,
        year: parseInt(year)
      },
      data: {
        ...(term === 'START' ? { startTermVisibility: 'PUBLISHED' } : {}),
        ...(term === 'END' ? { endTermVisibility: 'PUBLISHED' } : {}),
        visibility: 'PUBLISHED'  // Set overall visibility to PUBLISHED
      }
    })

    console.log(`Published ${result.count} questions for department ${departmentId}, term ${term}, year ${year}`)
    console.log(`Updated TermState visibility to PUBLISHED for ${term} term`)

    return NextResponse.json({ 
      message: `Successfully published ${result.count} questions`,
      publishedCount: result.count
    })
  } catch (error) {
    console.error('Error publishing questions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
