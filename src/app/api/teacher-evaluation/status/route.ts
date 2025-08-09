import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get department's active term
    const termState = await prisma.termState.findUnique({
      where: { departmentId: session.user.departmentId }
    })

    // Only count published questions
    const isPublished = termState?.visibility === 'PUBLISHED'

    // Resolve deadline from the currently active term that includes this department
    let activeTermDeadline: string | null = null
    if (termState?.activeTerm) {
      const activeTermRow = await prisma.term.findFirst({
        where: {
          status: termState.activeTerm as any,
          departments: { some: { id: session.user.departmentId } }
        },
        select: { endDate: true }
      })
      if (activeTermRow?.endDate) {
        activeTermDeadline = activeTermRow.endDate.toISOString()
      }
    }

    const startQuestionsCount = isPublished ? await prisma.question.count({
      where: {
        departmentId: session.user.departmentId,
        term: 'START'
      }
    }) : 0

    const endQuestionsCount = isPublished ? await prisma.question.count({
      where: {
        departmentId: session.user.departmentId,
        term: 'END'
      }
    }) : 0

    // Get teacher's submission status for each term
    const startAnswersCount = await prisma.teacherAnswer.count({
      where: {
        teacherId: session.user.id,
        term: 'START'
      }
    })

    const endAnswersCount = await prisma.teacherAnswer.count({
      where: {
        teacherId: session.user.id,
        term: 'END'
      }
    })

    const startSelfComment = await prisma.selfComment.findUnique({
      where: {
        teacherId_term: {
          teacherId: session.user.id,
          term: 'START'
        }
      }
    })

    const endSelfComment = await prisma.selfComment.findUnique({
      where: {
        teacherId_term: {
          teacherId: session.user.id,
          term: 'END'
        }
      }
    })

    // Determine status for each term
    const getTermStatus = (questionsCount: number, answersCount: number, hasSelfComment: boolean) => {
      if (questionsCount === 0) return 'NOT_AVAILABLE'
      if (answersCount === 0) return 'NOT_STARTED'
      if (answersCount === questionsCount && hasSelfComment) return 'SUBMITTED'
      return 'IN_PROGRESS'
    }

    const startStatus = getTermStatus(startQuestionsCount, startAnswersCount, !!startSelfComment)
    const endStatus = getTermStatus(endQuestionsCount, endAnswersCount, !!endSelfComment)

    const nowIso = new Date().toISOString()
    const startDeadline = termState?.activeTerm === 'START' ? activeTermDeadline : null
    const endDeadline = termState?.activeTerm === 'END' ? activeTermDeadline : null

    return NextResponse.json({
      activeTerm: termState?.activeTerm || null,
      start: {
        status: startStatus,
        questionsCount: startQuestionsCount,
        answersCount: startAnswersCount,
        hasSelfComment: !!startSelfComment,
        canSubmit: isPublished && termState?.activeTerm === 'START' && startStatus !== 'SUBMITTED' && (!!startDeadline && nowIso <= startDeadline),
        deadline: startDeadline
      },
      end: {
        status: endStatus,
        questionsCount: endQuestionsCount,
        answersCount: endAnswersCount,
        hasSelfComment: !!endSelfComment,
        canSubmit: isPublished && termState?.activeTerm === 'END' && endStatus !== 'SUBMITTED' && (!!endDeadline && nowIso <= endDeadline),
        deadline: endDeadline
      }
    })
  } catch (error) {
    console.error('Error fetching evaluation status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}