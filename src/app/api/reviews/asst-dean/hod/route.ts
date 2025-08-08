import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ASST_DEAN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const term = searchParams.get('term')
    if (!term || !['START','END'].includes(term)) {
      return NextResponse.json({ error: 'Valid term is required' }, { status: 400 })
    }

    const hods = await prisma.user.findMany({
      where: { role: 'HOD' },
      include: {
        department: true,
        hodPerformanceReviewsReceived: {
          where: { term: term as 'START'|'END' }
        }
      }
    })

    return NextResponse.json({ hods })
  } catch (error) {
    console.error('Error fetching HOD performance reviews:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ASST_DEAN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { hodId, term, comments, scores, totalScore, termId } = await request.json()
    if (!hodId || !term || !['START','END'].includes(term)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const hod = await prisma.user.findUnique({ where: { id: hodId } })
    if (!hod || hod.role !== 'HOD') {
      return NextResponse.json({ error: 'HOD not found' }, { status: 404 })
    }

    const review = await prisma.hodPerformanceReview.upsert({
      where: { hodId_term: { hodId, term } },
      update: {
        comments: comments || '',
        scores: scores || {},
        totalScore: typeof totalScore === 'number' ? totalScore : null,
        submitted: true,
        reviewerId: session.user.id,
        termId: termId || null
      },
      create: {
        hodId,
        term,
        comments: comments || '',
        scores: scores || {},
        totalScore: typeof totalScore === 'number' ? totalScore : null,
        submitted: true,
        reviewerId: session.user.id,
        termId: termId || null
      }
    })

    return NextResponse.json({ message: 'HOD performance review submitted', review })
  } catch (error) {
    console.error('Error submitting HOD performance review:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


