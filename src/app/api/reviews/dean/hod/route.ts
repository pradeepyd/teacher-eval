import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// List HODs with Assistant Dean reviews and Dean reviews
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'DEAN') {
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
          where: { term },
          include: { reviewer: { select: { id: true, name: true, role: true } } },
          orderBy: { updatedAt: 'desc' },
        },
      },
    })

    // HODs can always be evaluated by Dean - no admin permission needed
    const filtered = hods.filter(h => h.department?.id)

    // Calculate totalScore for each review based on rubric scores
    const hodsWithCalculatedScores = filtered.map(hod => ({
      ...hod,
      hodPerformanceReviewsReceived: hod.hodPerformanceReviewsReceived.map(review => {
        let calculatedTotalScore = review.totalScore
        
        // If no totalScore exists, calculate it from the rubric scores
        if (calculatedTotalScore === null && review.scores && typeof review.scores === 'object') {
          const scores = review.scores as Record<string, number>
          const prof = Object.keys(scores).filter(k => k.startsWith('[Professionalism]'))
          const leader = Object.keys(scores).filter(k => k.startsWith('[Leadership]'))
          const dev = Object.keys(scores).filter(k => k.startsWith('[Development]'))
          const service = Object.keys(scores).filter(k => k.startsWith('[Service]'))
          
          const sum = (keys: string[]) => keys.reduce((acc, k) => acc + (scores[k] || 0), 0)
          const raw = sum(prof) + sum(leader) + sum(dev) + sum(service)
          const max = (prof.length + leader.length + dev.length + service.length) * 5
          
          calculatedTotalScore = max > 0 ? Math.round((raw / max) * 100) : null
        }
        
        return {
          ...review,
          totalScore: calculatedTotalScore
        }
      })
    }))

    return NextResponse.json({ hods: hodsWithCalculatedScores })
  } catch (_e) {
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Dean submits/updates their HOD performance review
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'DEAN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { hodId, term, comments, totalScore, promoted } = await request.json()
    if (!hodId || !term || !['START', 'END'].includes(term)) {
      return NextResponse.json({ error: 'hodId and valid term are required' }, { status: 400 })
    }

    // Use the provided totalScore or default to null
    // Ensure totalScore is within 0-100 range (percentage)
    let computedTotal = typeof totalScore === 'number' ? totalScore : null
    if (computedTotal !== null) {
      // Clamp to 0-100 range
      computedTotal = Math.max(0, Math.min(100, computedTotal))
    }

    // First, get the term ID for the current year and term
    const termRecord = await prisma.term.findFirst({
      where: { 
        year: new Date().getFullYear(),
        name: term 
      }
    })

    const review = await prisma.hodPerformanceReview.upsert({
      where: { hodId_term_year_reviewerId: { hodId, term, year: new Date().getFullYear(), reviewerId: session.user.id } },
      update: {
        reviewerId: session.user.id,
        comments: comments ?? '',
        scores: {},
        totalScore: computedTotal,
        status: promoted ? 'PROMOTED' : 'ON_HOLD',
        submitted: true,
        termId: termRecord?.id || null,
      },
      create: {
        hodId,
        term,
        year: new Date().getFullYear(),
        reviewerId: session.user.id,
        comments: comments ?? '',
        scores: {},
        totalScore: computedTotal,
        status: promoted ? 'PROMOTED' : 'ON_HOLD',
        submitted: true,
        termId: termRecord?.id || null,
      },
    })

    return NextResponse.json({ review })
  } catch (_e) {
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


