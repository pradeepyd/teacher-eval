import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const departmentId = searchParams.get('departmentId')
    const requestedRole = searchParams.get('role')
    const year = searchParams.get('year')
    const format = searchParams.get('format') || 'json'

    // Build where clause for users based on role
    const whereClause: any = {}

    // Role scoping
    const userRole = session.user.role
    if (userRole === 'ADMIN' || userRole === 'DEAN' || userRole === 'ASST_DEAN') {
      // Full visibility - include both TEACHER and HOD roles
      whereClause.role = { in: ['TEACHER', 'HOD'] }
    } else if (userRole === 'HOD') {
      // Only teachers and HODs in their department
      whereClause.role = { in: ['TEACHER', 'HOD'] }
      whereClause.departmentId = session.user.departmentId
    } else if (userRole === 'TEACHER') {
      // Only self
      whereClause.id = session.user.id
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (departmentId && departmentId !== 'ALL') {
      whereClause.departmentId = departmentId
    }

    // Optional additional role filter (for admin/dean/asst only)
    if (requestedRole && requestedRole !== 'ALL') {
      // Do not allow narrowing away from TEACHER for HOD/TEACHER scopes
      if (userRole === 'ADMIN' || userRole === 'DEAN' || userRole === 'ASST_DEAN') {
        whereClause.role = requestedRole
      }
    }

    // If year filter provided, get matching term ids (any status)
    let termIds: string[] | undefined
    if (year && year !== 'ALL') {
      const terms = await prisma.term.findMany({ where: { year: Number(year) } })
      termIds = terms.map(t => t.id)
    }

    const staff = await prisma.user.findMany({
      where: whereClause,
      include: {
        department: true,
        teacherAnswers: {
          where: termIds ? { termId: { in: termIds } } : undefined,
          include: { question: true }
        },
        selfComments: termIds ? { where: { termId: { in: termIds } } } : true,
        receivedHodReviews: {
          where: { submitted: true, ...(termIds ? { termId: { in: termIds } } : {}) }
        },
        receivedAsstReviews: {
          where: { submitted: true, ...(termIds ? { termId: { in: termIds } } : {}) }
        },
        receivedFinalReviews: termIds ? { where: { termId: { in: termIds } } } : true,
        hodPerformanceReviewsReceived: termIds ? { 
          where: { termId: { in: termIds } },
          include: { reviewer: { select: { id: true, role: true } } }
        } : true,
      }
    })

    // Transform data for reports
    const effectiveYear = year && year !== 'ALL' ? Number(year) : new Date().getFullYear()

    const results = staff.map(staffMember => {
      const startAnswers = staffMember.teacherAnswers.filter(a => a.term === 'START')
      const endAnswers = staffMember.teacherAnswers.filter(a => a.term === 'END')
      const startSelfComment = staffMember.selfComments.find(c => c.term === 'START')
      const endSelfComment = staffMember.selfComments.find(c => c.term === 'END')
      const startHodReview = staffMember.receivedHodReviews.find(r => r.term === 'START')
      const endHodReview = staffMember.receivedHodReviews.find(r => r.term === 'END')
      const startAsstReview = staffMember.receivedAsstReviews.find(r => r.term === 'START')
      const endAsstReview = staffMember.receivedAsstReviews.find(r => r.term === 'END')
      const startFinalReview = staffMember.receivedFinalReviews.find(r => r.term === 'START')
      const endFinalReview = staffMember.receivedFinalReviews.find(r => r.term === 'END')
      
      // For HODs, also check performance reviews (any submitted review means they've been evaluated)
      const startHodPerformanceReview = staffMember.role === 'HOD' ? 
        staffMember.hodPerformanceReviewsReceived.find(r => r.term === 'START' && r.submitted) : null
      const endHodPerformanceReview = staffMember.role === 'HOD' ? 
        staffMember.hodPerformanceReviewsReceived.find(r => r.term === 'END' && r.submitted) : null

      // Helper function to calculate max score from rubric
      const calculateMaxScore = (review: any) => {
        if (!review?.scores) return 50 // Default fallback reduced
        try {
          const scores = typeof review.scores === 'string' ? JSON.parse(review.scores) : review.scores
          if (scores.rubric && typeof scores.rubric === 'object') {
            let total = 0
            Object.values(scores.rubric).forEach((category: any) => {
              if (typeof category === 'object' && category !== null) {
                Object.values(category).forEach((item: any) => {
                  if (typeof item === 'number') total += 5 // Max 5 per rubric item
                })
              } else if (typeof category === 'number') {
                total += 5 // Max 5 per category
              }
            })
            return total || 50
          }
        } catch (_e) {
          // If parsing fails, return default
        }
        return 50 // Default fallback reduced
      }

      const startHodMaxScore = calculateMaxScore(startHodReview)
      const startAsstMaxScore = calculateMaxScore(startAsstReview)
      const endHodMaxScore = calculateMaxScore(endHodReview)
      const endAsstMaxScore = calculateMaxScore(endAsstReview)

      return {
        id: staffMember.id,
        name: staffMember.name,
        email: staffMember.email,
        role: staffMember.role,
        department: staffMember.department?.name || 'N/A',
        departmentId: staffMember.department?.id || '',
        year: effectiveYear,
        terms: {
          START: {
            hasSubmitted: startAnswers.length > 0 && startSelfComment,
            questionsAnswered: startAnswers.length,
            maxQuestions: startAnswers.length,
            hodScore: (startHodReview?.scores as any)?.totalScore || 0,
            asstScore: (startAsstReview?.scores as any)?.totalScore || 0,
            totalCombinedScore: ((startHodReview?.scores as any)?.totalScore || 0) + ((startAsstReview?.scores as any)?.totalScore || 0),
            finalScore: startFinalReview?.finalScore || 0,
            maxPossibleScore: startHodMaxScore + startAsstMaxScore,
            hodMaxScore: startHodMaxScore,
            asstMaxScore: startAsstMaxScore,
            deanMaxScore: 100,
            status: startFinalReview?.submitted ? startFinalReview.status : 
                    (startHodPerformanceReview?.submitted ? startHodPerformanceReview.status : 'PENDING'),
            promoted: startFinalReview?.submitted && startFinalReview?.status === 'PROMOTED' ||
                     startHodPerformanceReview?.submitted && startHodPerformanceReview.status === 'PROMOTED',
            hodReviewer: startHodReview?.reviewerId || null,
            asstReviewer: startAsstReview?.reviewerId || null,
            deanReviewer: startFinalReview?.reviewerId || startHodPerformanceReview?.reviewerId || null,
            submittedAt: startSelfComment?.createdAt || null,
            hodReviewedAt: startHodReview?.createdAt || null,
            asstReviewedAt: startAsstReview?.createdAt || null,
            finalReviewedAt: startFinalReview?.createdAt || startHodPerformanceReview?.createdAt || null
          },
          END: {
            hasSubmitted: endAnswers.length > 0 && endSelfComment,
            questionsAnswered: endAnswers.length,
            maxQuestions: endAnswers.length,
            hodScore: (endHodReview?.scores as any)?.totalScore || 0,
            asstScore: (endAsstReview?.scores as any)?.totalScore || 0,
            totalCombinedScore: ((endHodReview?.scores as any)?.totalScore || 0) + ((endAsstReview?.scores as any)?.totalScore || 0),
            finalScore: endFinalReview?.finalScore || 0,
            maxPossibleScore: endHodMaxScore + endAsstMaxScore,
            hodMaxScore: endHodMaxScore,
            asstMaxScore: endAsstMaxScore,
            deanMaxScore: 100,
            status: endFinalReview?.submitted ? endFinalReview.status : 
                    (endHodPerformanceReview?.submitted ? endHodPerformanceReview.status : 'PENDING'),
            promoted: endFinalReview?.submitted && endFinalReview?.status === 'PROMOTED' ||
                     endHodPerformanceReview?.submitted && endHodPerformanceReview.status === 'PROMOTED',
            hodReviewer: endHodReview?.reviewerId || null,
            asstReviewer: endAsstReview?.reviewerId || null,
            deanReviewer: endFinalReview?.reviewerId || endHodPerformanceReview?.reviewerId || null,
            submittedAt: endSelfComment?.createdAt || null,
            hodReviewedAt: endHodReview?.createdAt || null,
            asstReviewedAt: endAsstReview?.createdAt || null,
            finalReviewedAt: endFinalReview?.createdAt || endHodPerformanceReview?.createdAt || null
          }
        }
      }
    })

    const summary = {
      totalStaff: results.length,
      totalTeachers: results.filter(r => r.role === 'TEACHER').length,
      totalHODs: results.filter(r => r.role === 'HOD').length,
      departmentsIncluded: [...new Set(results.map(r => r.department))],
      termsIncluded: ['START', 'END'],
      generatedAt: new Date().toISOString(),
      generatedBy: session.user.name || session.user.email
    }

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = [
        'Staff Name',
        'Email',
        'Department',
        'Role',
        'Year',
        'Term',
        'Status',
        'HOD Score',
        'Assistant Dean Score',
        'Final Score',
        'Max Possible Score',
        'Performance %'
      ]

      const csvRows = results.flatMap(teacher => 
        Object.entries(teacher.terms).map(([term, data]) => [
          teacher.name,
          teacher.email,
          teacher.department,
          teacher.role,
          teacher.year,
          term,
          data.status,
          data.hodScore,
          data.asstScore,
          data.finalScore,
          data.maxPossibleScore,
          data.maxPossibleScore > 0 ? Math.round((data.finalScore / data.maxPossibleScore) * 100) : 0
        ])
      )

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="teacher-evaluation-results-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    // Add band classification in JSON too
    const withBands = results.map(r => ({
      ...r,
      terms: {
        START: {
          ...r.terms.START,
          band: (() => { const p = r.terms.START.maxPossibleScore > 0 ? Math.round((r.terms.START.finalScore / r.terms.START.maxPossibleScore) * 100) : 0; return p>=90?'Excellent':p>=80?'Very Good':p>=70?'Good':p>=50?'Average':'Weak' })()
        },
        END: {
          ...r.terms.END,
          band: (() => { const p = r.terms.END.maxPossibleScore > 0 ? Math.round((r.terms.END.finalScore / r.terms.END.maxPossibleScore) * 100) : 0; return p>=90?'Excellent':p>=80?'Very Good':p>=70?'Good':p>=50?'Average':'Weak' })()
        }
      }
    }))

    return NextResponse.json({ results: withBands, summary })
  } catch (_error) {
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
