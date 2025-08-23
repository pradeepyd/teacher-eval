import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

          // Get current year for active term filtering
      const currentYear = new Date().getFullYear()

      // Fetch all terms for the current year
      const currentYearTerms = await prisma.term.findMany({
        where: { year: currentYear }
      })

      // Debug logging for terms
      console.log('Terms Query:', {
        currentYear,
        foundTerms: currentYearTerms.length,
        terms: currentYearTerms.map(t => ({ id: t.id, name: t.name, year: t.year }))
      })

    let evaluations: Record<string, unknown>[] = []

    if (currentYearTerms.length > 0) {
      // Fetch teacher final reviews (teachers finalized by dean)
      const teacherFinalReviews = await prisma.finalReview.findMany({
        where: {
          submitted: true,
          termId: { in: currentYearTerms.map(t => t.id) }
        },
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              role: true,
              department: { select: { name: true } }
            }
          },
          reviewer: { select: { name: true } }
        }
      })

      // Fetch HOD performance reviews (HODs finalized by dean)
      const hodPerformanceReviews = await prisma.hodPerformanceReview.findMany({
        where: {
          submitted: true,
          OR: [
            { termId: { in: currentYearTerms.map(t => t.id) } },
            { 
              AND: [
                { year: currentYear },
                { term: { in: ['START', 'END'] } }
              ]
            }
          ]
        },
        include: {
          hod: {
            select: {
              id: true,
              name: true,
              role: true,
              department: { select: { name: true } }
            }
          },
          reviewer: { select: { name: true, role: true } }
        }
      }).then(reviews => reviews.filter(review => review.reviewer.role === 'DEAN'))

      // Debug logging for HOD performance reviews
      console.log('HOD Performance Reviews Query:', {
        currentYearTerms: currentYearTerms.map(t => ({ id: t.id, name: t.name })),
        foundHodReviews: hodPerformanceReviews.length,
        hodReviews: hodPerformanceReviews.map(r => ({
          hodName: r.hod.name,
          hodRole: r.hod.role,
          reviewerRole: r.reviewer.role,
          submitted: r.submitted,
          status: r.status
        }))
      })

      // Transform teacher final reviews
      const teacherEvaluations = teacherFinalReviews.map(review => ({
        id: review.id,
        name: review.teacher.name,
        role: review.teacher.role,
        department: review.teacher.department?.name || 'N/A',
        status: review.status,
        finalScore: review.finalScore,
        finalizedDate: review.updatedAt,
        reviewer: review.reviewer.name,
        type: 'teacher'
      }))

      // Transform HOD performance reviews
      const hodEvaluations = hodPerformanceReviews.map(review => ({
        id: review.id,
        name: review.hod.name,
        role: review.hod.role,
        department: review.hod.department?.name || 'N/A',
        status: review.status || 'ON_HOLD',
        finalScore: review.totalScore || 0,
        finalizedDate: review.updatedAt,
        reviewer: review.reviewer.name,
        type: 'hod'
      }))

      evaluations = [...teacherEvaluations, ...hodEvaluations]
    } else {
      // If no terms exist for current year, try to get basic completed reviews
      const basicTeacherReviews = await prisma.finalReview.findMany({
        where: { submitted: true },
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              role: true,
              department: { select: { name: true } }
            }
          },
          reviewer: { select: { name: true } }
        }
      })

      const basicHodReviews = await prisma.hodPerformanceReview.findMany({
        where: { 
          submitted: true,
          reviewer: { role: 'DEAN' }
        },
        include: {
          hod: {
            select: {
              id: true,
              name: true,
              role: true,
              department: { select: { name: true } }
            }
          },
          reviewer: { select: { name: true, role: true } }
        }
      })

      // Debug logging for basic HOD reviews
      console.log('Basic HOD Reviews Query:', {
        foundBasicHodReviews: basicHodReviews.length,
        basicHodReviews: basicHodReviews.map(r => ({
          hodName: r.hod.name,
          hodRole: r.hod.role,
          reviewerRole: r.reviewer.role,
          submitted: r.submitted,
          status: r.status
        }))
      })

      const teacherEvaluations = basicTeacherReviews.map(review => ({
        id: review.id,
        name: review.teacher.name,
        role: review.teacher.role,
        department: review.teacher.department?.name || 'N/A',
        status: review.status,
        finalScore: review.finalScore,
        finalizedDate: review.updatedAt,
        reviewer: review.reviewer.name,
        type: 'teacher'
      }))

      const hodEvaluations = basicHodReviews.map(review => ({
        id: review.id,
        name: review.hod.name,
        role: review.hod.role,
        department: review.hod.department?.name || 'N/A',
        status: review.status || 'ON_HOLD',
        finalScore: review.totalScore || 0,
        finalizedDate: review.updatedAt,
        reviewer: review.reviewer.name,
        type: 'hod'
      }))

      evaluations = [...teacherEvaluations, ...hodEvaluations]
    }

    // Sort by finalized date (most recent first)
    evaluations.sort((a, b) => new Date(b.finalizedDate).getTime() - new Date(a.finalizedDate).getTime())

    return NextResponse.json({ 
      evaluations,
      total: evaluations.length,
      currentYear
    })
  } catch (error) {
    console.error('Error fetching completed evaluations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch completed evaluations' },
      { status: 500 }
    )
  }
}
