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

    // Simple database connection test
    try {
      await prisma.$queryRaw`SELECT 1`
    } catch (dbError) {
      console.error('Database connection failed:', dbError)
      // Continue anyway - the main query might work
    }

    // Optimized query with better filtering and limiting
    const hods = await prisma.user.findMany({
      where: { 
        role: 'HOD',
        departmentId: { not: null } // Only HODs with departments
      },
      select: {
        id: true,
        name: true,
        email: true,
        department: { select: { id: true, name: true } },
        hodPerformanceReviewsReceived: {
          where: { 
            reviewerId: session.user.id, 
            term,
            year: new Date().getFullYear() // Only current year reviews
          },
          orderBy: { updatedAt: 'desc' },
          take: 1,
          select: { comments: true, totalScore: true, submitted: true, scores: true }
        }
      },
      // Add pagination for large datasets
      take: 100,
      orderBy: { name: 'asc' }
    })

    console.log(`Found ${hods.length} HODs for term ${term}`)
    hods.forEach(hod => {
      console.log(`HOD: ${hod.name} - Department: ${hod.department?.name || 'No Dept'}`)
    })

    // Add default rubric structure for HODs that don't have existing reviews
    const hodsWithRubric = hods.map(hod => {
      const existingReview = hod.hodPerformanceReviewsReceived[0]
      
      // Default rubric structure for HOD evaluation (matching the component expectations)
      const defaultRubric = {
        '[Professionalism] Compliance': 3,
        '[Professionalism] Punctuality/Attendance': 3,
        '[Professionalism] Competence and Performance': 3,
        '[Leadership] Planning & Organization': 3,
        '[Leadership] Department Duties': 3,
        '[Leadership] Collegial Relationship & Work Delegation': 3,
        '[Leadership] College Committees': 3,
        '[Development] In-Service Training': 3,
        '[Development] Research and Publications': 3,
        '[Development] National and International Conferences': 3,
        '[Service] Students\' Engagement': 3,
        '[Service] Community Engagement': 3
      }

      return {
        ...hod,
        rubric: existingReview?.scores || defaultRubric,
        existingReview: existingReview || null,
        comments: existingReview?.comments || ''
      }
    })

    return NextResponse.json({ hods: hodsWithRubric })
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

    const existingReview = await prisma.hodPerformanceReview.findUnique({
      where: { 
        hodId_term_year_reviewerId: { 
          hodId, 
          term, 
          year: new Date().getFullYear(),
          reviewerId: session.user.id 
        } 
      }
    })

    if (existingReview) {
      return NextResponse.json({ error: 'Review already submitted for this HOD and term' }, { status: 400 })
    }

    const review = await prisma.hodPerformanceReview.create({
      data: {
        hodId,
        term,
        year: new Date().getFullYear(),
        reviewerId: session.user.id,
        comments,
        scores,
        totalScore,
        submitted: true
      }
    })

    return NextResponse.json({ review })
  } catch (e) {
    console.error('Error submitting HOD review:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Duplicated imports and handlers below were removed to prevent multiple definition errors.
