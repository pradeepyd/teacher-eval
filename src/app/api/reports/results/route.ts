import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['DEAN', 'ASST_DEAN', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const departmentId = searchParams.get('departmentId')
    const role = searchParams.get('role')
    const year = searchParams.get('year')
    const format = searchParams.get('format') || 'json'

    // Build where clause
    const whereClause: any = {
      role: 'TEACHER'
    }

    if (departmentId && departmentId !== 'ALL') {
      whereClause.departmentId = departmentId
    }

    if (role && role !== 'ALL') {
      whereClause.role = role
    }

    // Get teachers with their evaluation data
    const teachers = await prisma.user.findMany({
      where: whereClause,
      include: {
        department: true,
        teacherAnswers: {
          include: {
            question: true
          }
        },
        selfComments: true,
        receivedHodReviews: {
          where: {
            submitted: true
          }
        },
        receivedAsstReviews: {
          where: {
            submitted: true
          }
        },
        receivedFinalReviews: {
          where: {
            submitted: true
          }
        }
      }
    })

    // Transform data for reports
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
        year: new Date().getFullYear(),
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

    // Filter by year if specified
    const filteredResults = year && year !== 'ALL' 
      ? results.filter(r => r.year.toString() === year)
      : results

    const summary = {
      totalTeachers: filteredResults.length,
      departmentsIncluded: [...new Set(filteredResults.map(r => r.department))],
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

      const csvRows = filteredResults.flatMap(teacher => 
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

    return NextResponse.json({
      results: filteredResults,
      summary
    })
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}