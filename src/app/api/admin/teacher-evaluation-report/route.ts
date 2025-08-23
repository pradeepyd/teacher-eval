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

    const { teacherId, term } = await request.json()

    if (!teacherId || !term || !['START', 'END'].includes(term)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    // Get teacher's evaluation data for the specific term
    // Get HOD review
    const hodReview = await prisma.hodReview.findFirst({
      where: {
        teacherId,
        term: term as 'START' | 'END',
        year: new Date().getFullYear()
      }
    })

    // Get Assistant Dean review
    const asstDeanReview = await prisma.asstReview.findFirst({
      where: {
        teacherId,
        term: term as 'START' | 'END',
        year: new Date().getFullYear()
      }
    })

    // Get Dean final review
    const deanReview = await prisma.finalReview.findFirst({
      where: {
        teacherId,
        term: term as 'START' | 'END',
        year: new Date().getFullYear()
      }
    })

    // Parse scores if they're stored as JSON strings
    const hodScores = hodReview?.scores ? 
      (typeof hodReview.scores === 'string' ? JSON.parse(hodReview.scores) : hodReview.scores) : null
    const asstDeanScores = asstDeanReview?.scores ? 
      (typeof asstDeanReview.scores === 'string' ? JSON.parse(asstDeanReview.scores) : asstDeanReview.scores) : null
    
    // Prepare response data with all scores - EXACT same as teacher evaluation report API
    const evaluationData = {
      hodComment: hodReview?.comments || null,
      hodScore: hodScores?.overallRating || hodScores?.score || hodScores?.rating || null,
      hodTotalScore: hodScores?.totalScore || null,
      asstDeanComment: asstDeanReview?.comments || null,
      asstDeanScore: asstDeanScores?.totalScore || null,
      deanComment: deanReview?.finalComment || null,
      finalScore: deanReview?.finalScore || null,
      promoted: deanReview?.status === 'PROMOTED' || null
    }

    return NextResponse.json(evaluationData)

  } catch (error) {
    console.error('Error fetching admin teacher evaluation report data:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
