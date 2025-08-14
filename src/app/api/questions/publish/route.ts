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

    const { term } = await request.json()

    if (!term || !['START', 'END'].includes(term)) {
      return NextResponse.json({ error: 'Valid term is required' }, { status: 400 })
    }

    // Check if there are questions to publish
    const questionsCount = await prisma.question.count({
      where: {
        departmentId: session.user.departmentId,
        term: term as 'START' | 'END',
        isActive: true,
        isPublished: false
      }
    })

    if (questionsCount === 0) {
      return NextResponse.json({ 
        error: 'No unpublished questions found for this term' 
      }, { status: 400 })
    }

    // Publish all questions for this term
    const result = await prisma.question.updateMany({
      where: {
        departmentId: session.user.departmentId,
        term: term as 'START' | 'END',
        isActive: true,
        isPublished: false
      },
      data: {
        isPublished: true
      }
    })

    return NextResponse.json({ 
      message: `${result.count} questions published for ${term} term`,
      publishedCount: result.count
    })
  } catch (error) {
    console.error('Error publishing questions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
