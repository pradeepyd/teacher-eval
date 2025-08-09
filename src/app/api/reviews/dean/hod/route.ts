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

    // Enforce HOD evaluation publish gate
    const deptIds = Array.from(new Set(hods.map(h => h.department?.id).filter(Boolean))) as string[]
    const termStates = await prisma.termState.findMany({ where: { departmentId: { in: deptIds } } })
    const deptIdToGate = new Map(termStates.map((s: any) => [s.departmentId, s]))
    const filtered = hods.filter(h => {
      const s: any = h.department ? deptIdToGate.get(h.department.id) : null
      return s && s.activeTerm === term && (s.hodVisibility === 'PUBLISHED')
    })

    return NextResponse.json({ hods: filtered })
  } catch (e) {
    console.error('Error loading HOD performance for Dean:', e)
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

    const { hodId, term, comments, scores, totalScore } = await request.json()
    if (!hodId || !term || !['START', 'END'].includes(term)) {
      return NextResponse.json({ error: 'hodId and valid term are required' }, { status: 400 })
    }

    // Normalize rubric to a /100 total if rubric present
    let computedTotal = typeof totalScore === 'number' ? totalScore : null
    if (scores && typeof scores === 'object' && !Number.isFinite(computedTotal)) {
      const s = scores as Record<string, number>
      const prof = Object.keys(s).filter(k => k.startsWith('[Professionalism]'))
      const leader = Object.keys(s).filter(k => k.startsWith('[Leadership]'))
      const dev = Object.keys(s).filter(k => k.startsWith('[Development]'))
      const service = Object.keys(s).filter(k => k.startsWith('[Service]'))
      const sum = (keys: string[]) => keys.reduce((acc, k) => acc + (s[k] || 0), 0)
      const raw = sum(prof) + sum(leader) + sum(dev) + sum(service)
      const max = (prof.length + leader.length + dev.length + service.length) * 5
      computedTotal = max > 0 ? Math.round((raw / max) * 100) : null
    }

    const review = await prisma.hodPerformanceReview.upsert({
      where: { hodId_term_reviewerId: { hodId, term, reviewerId: session.user.id } as any },
      update: {
        reviewerId: session.user.id,
        comments: comments ?? '',
        scores: scores ?? {},
        totalScore: computedTotal,
        submitted: true,
      },
      create: {
        hodId,
        term,
        reviewerId: session.user.id,
        comments: comments ?? '',
        scores: scores ?? {},
        totalScore: computedTotal,
        submitted: true,
      },
    })

    return NextResponse.json({ review })
  } catch (e) {
    console.error('Error submitting Dean HOD review:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


