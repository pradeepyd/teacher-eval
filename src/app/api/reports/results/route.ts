import { NextRequest, NextResponse } from 'next/server'
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
      // Full visibility
      whereClause.role = 'TEACHER'
    } else if (userRole === 'HOD') {
      // Only teachers in their department
      whereClause.role = 'TEACHER'
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

    const teachers = await prisma.user.findMany({
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
      }
    })

    // Transform data for reports
    const effectiveYear = year && year !== 'ALL' ? Number(year) : new Date().getFullYear()

    const results = teachers.map(teacher => {
      const startAnswers = teacher.teacherAnswers.filter(a => a.term === 'START')
      const endAnswers = teacher.teacherAnswers.filter(a => a.term === 'END')
      const startSelfComment = teacher.selfComments.find(c => c.term === 'START')
      const endSelfComment = teacher.selfComments.find(c => c.term === 'END')
      const startHodReview = teacher.receivedHodReviews.find(r => r.term === 'START')
      const endHodReview = teacher.receivedHodReviews.find(r => r.term === 'END')
      const startAsstReview = teacher.receivedAsstReviews.find(r => r.term === 'START')
      const endAsstReview = teacher.receivedAsstReviews.find(r => r.term === 'END')
      const startFinalReview = teacher.receivedFinalReviews.find(r => r.term === 'START')
      const endFinalReview = teacher.receivedFinalReviews.find(r => r.term === 'END')

      return {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        role: teacher.role,
        department: teacher.department.name,
        departmentId: teacher.department.id,
        year: effectiveYear,
        terms: {
          START: {
            hasSubmitted: startAnswers.length > 0 && startSelfComment,
            questionsAnswered: startAnswers.length,
            maxQuestions: startAnswers.length,
            hodScore: startHodReview?.scores?.totalScore || 0,
            asstScore: startAsstReview?.scores?.totalScore || 0,
            finalScore: startFinalReview?.finalScore || 0,
            maxPossibleScore: startAnswers.length * 10,
            status: startFinalReview?.status || 'PENDING',
            hodReviewer: startHodReview?.reviewer?.name || null,
            asstReviewer: startAsstReview?.reviewer?.name || null,
            deanReviewer: startFinalReview?.reviewer?.name || null,
            submittedAt: startSelfComment?.createdAt || null,
            hodReviewedAt: startHodReview?.createdAt || null,
            asstReviewedAt: startAsstReview?.createdAt || null,
            finalReviewedAt: startFinalReview?.createdAt || null
          },
          END: {
            hasSubmitted: endAnswers.length > 0 && endSelfComment,
            questionsAnswered: endAnswers.length,
            maxQuestions: endAnswers.length,
            hodScore: endHodReview?.scores?.totalScore || 0,
            asstScore: endAsstReview?.scores?.totalScore || 0,
            finalScore: endFinalReview?.finalScore || 0,
            maxPossibleScore: endAnswers.length * 10,
            status: endFinalReview?.status || 'PENDING',
            hodReviewer: endHodReview?.reviewer?.name || null,
            asstReviewer: endAsstReview?.reviewer?.name || null,
            deanReviewer: endFinalReview?.reviewer?.name || null,
            submittedAt: endSelfComment?.createdAt || null,
            hodReviewedAt: endHodReview?.createdAt || null,
            asstReviewedAt: endAsstReview?.createdAt || null,
            finalReviewedAt: endFinalReview?.createdAt || null
          }
        }
      }
    })

    const summary = {
      totalTeachers: results.length,
      departmentsIncluded: [...new Set(results.map(r => r.department))],
      termsIncluded: ['START', 'END'],
      generatedAt: new Date().toISOString(),
      generatedBy: session.user.name || session.user.email
    }

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = [
        'Teacher Name',
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

    return NextResponse.json({ results, summary })
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}