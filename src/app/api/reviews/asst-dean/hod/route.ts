import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// List HODs for the Assistant Dean to evaluate for a given term
export async function GET(request: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions as any)
    if (!session || session.user.role !== 'ASST_DEAN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const term = (searchParams.get('term') as 'START' | 'END') || 'START'

    const hods = await prisma.user.findMany({
      where: { role: 'HOD' },
      select: {
        id: true,
        name: true,
        email: true,
        department: { select: { id: true, name: true } },
        hodPerformanceReviewsReceived: {
          where: { reviewerId: session.user.id, term },
          orderBy: { updatedAt: 'desc' },
          take: 1,
          select: { comments: true, totalScore: true, submitted: true }
        }
      }
    })

    return NextResponse.json({ hods })
  } catch (e) {
    console.error('Error loading HODs:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create or update a HOD performance review
export async function POST(request: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions as any)
    if (!session || session.user.role !== 'ASST_DEAN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { hodId, term, comments, scores, totalScore } = await request.json()
    if (!hodId || !term || !['START', 'END'].includes(term)) {
      return NextResponse.json({ error: 'hodId and valid term are required' }, { status: 400 })
    }

    const review = await prisma.hodPerformanceReview.upsert({
      where: { hodId_term: { hodId, term } as any },
      update: {
        reviewerId: session.user.id,
        comments: comments ?? '',
        scores: scores ?? {},
        totalScore: typeof totalScore === 'number' ? totalScore : null,
        submitted: true,
      },
      create: {
        hodId,
        term,
        reviewerId: session.user.id,
        comments: comments ?? '',
        scores: scores ?? {},
        totalScore: typeof totalScore === 'number' ? totalScore : null,
        submitted: true,
      }
    })

    return NextResponse.json({ review })
  } catch (e) {
    console.error('Error submitting HOD review:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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


