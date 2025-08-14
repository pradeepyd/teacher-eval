import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'HOD') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get('teacherId')
    const term = searchParams.get('term')

    // If no teacherId provided, return list of teachers in HOD's department with basic review status
    if (!teacherId) {
      const departmentId = session.user.departmentId as string | null
      if (!departmentId) {
        return NextResponse.json({ teachers: [] })
      }

      // HOD can access teacher list if ANY term evaluation is published
      // Individual teacher access is still controlled by specific term publishing
      const termState = await prisma.termState.findUnique({ where: { departmentId } })
      const hasAnyReviewAccess = 
        (termState as any)?.startTermVisibility === 'PUBLISHED' || 
        (termState as any)?.endTermVisibility === 'PUBLISHED' ||
        termState?.visibility === 'PUBLISHED'
      
      if (!hasAnyReviewAccess) {
        return NextResponse.json({ 
          teachers: [], 
          message: 'Teacher evaluation review access not enabled. Contact admin to publish teacher evaluation access for HOD review.' 
        })
      }

      // Determine active term for department (optional)
      const activeTerm = termState?.activeTerm || 'START'

      const teachers = await prisma.user.findMany({
        where: { role: 'TEACHER', departmentId },
        select: { id: true, name: true, email: true }
      })

      // Fetch existing HOD reviews to decide status/canReview
      const reviews = await prisma.hodReview.findMany({
        where: { reviewerId: session.user.id, term: activeTerm },
        select: { teacherId: true, submitted: true, comments: true, scores: true }
      })

      const teacherIdToReview = new Map(reviews.map(r => [r.teacherId, r]))

      // For each teacher, detect if they have submitted their evaluation for the active term
      const shaped = await Promise.all(teachers.map(async (t) => {
        const r = teacherIdToReview.get(t.id)
        const hodReviewed = !!r?.submitted

        // teacher submission check: answers exist OR selfComment.submitted === true
        const [answersCount, selfComment] = await Promise.all([
          prisma.teacherAnswer.count({ where: { teacherId: t.id, term: activeTerm as any } }),
          prisma.selfComment.findUnique({ where: { teacherId_term: { teacherId: t.id, term: activeTerm as any } }, select: { submitted: true } })
        ])
        const teacherSubmitted = answersCount > 0 || !!selfComment?.submitted

        const status = hodReviewed ? 'REVIEWED' : (teacherSubmitted ? 'SUBMITTED' : 'NOT_STARTED')

        return {
          id: t.id,
          name: t.name,
          email: t.email,
          status,
          answers: {},
          selfComment: '',
          hodComment: (r?.comments as string) || '',
          hodScore: typeof (r?.scores as any)?.totalScore === 'number' ? (r?.scores as any).totalScore : 0,
          canReview: teacherSubmitted && !hodReviewed,
        }
      }))

      return NextResponse.json({ teachers: shaped })
    }

    // For single-teacher detail fetch, require valid term
    if (!term || !['START', 'END'].includes(term)) {
      return NextResponse.json({ error: 'Valid term is required' }, { status: 400 })
    }

    // Check if teacher evaluation is published for the specific term
    const termState = await prisma.termState.findUnique({ 
      where: { departmentId: session.user.departmentId } 
    })
    const isTermPublished = term === 'START' 
      ? ((termState as any)?.startTermVisibility === 'PUBLISHED' || termState?.visibility === 'PUBLISHED')
      : ((termState as any)?.endTermVisibility === 'PUBLISHED' || termState?.visibility === 'PUBLISHED')
    
    if (!isTermPublished) {
      return NextResponse.json({ 
        error: `${term} term teacher evaluation review access not enabled. Contact admin to publish teacher evaluation access for HOD review.` 
      }, { status: 403 })
    }

    // Verify teacher belongs to HOD's department
    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
      include: { department: true }
    })

    if (!teacher || teacher.departmentId !== session.user.departmentId) {
      return NextResponse.json({ error: 'Teacher not found or unauthorized' }, { status: 404 })
    }

    // Get teacher's answers with questions
    const teacherAnswers = await prisma.teacherAnswer.findMany({
      where: {
        teacherId,
        term: term as 'START' | 'END'
      },
      include: {
        question: true
      },
      orderBy: {
        question: {
          order: 'asc'
        }
      }
    })

    // Get teacher's self comment
    const selfComment = await prisma.selfComment.findUnique({
      where: {
        teacherId_term: {
          teacherId,
          term: term as 'START' | 'END'
        }
      }
    })

    // Get existing HOD review
    const existingReview = await prisma.hodReview.findUnique({
      where: {
        teacherId_term: {
          teacherId,
          term: term as 'START' | 'END'
        }
      }
    })

    return NextResponse.json({
      teacher: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        department: teacher.department
      },
      answers: teacherAnswers,
      selfComment: selfComment?.comment || '',
      existingReview: existingReview || null,
      canEdit: !existingReview?.submitted
    })
  } catch (error) {
    console.error('Error fetching teacher data for HOD review:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
