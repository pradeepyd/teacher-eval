import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get department's active term
    const termState = await prisma.termState.findUnique({
      where: { departmentId: session.user.departmentId }
    })

    // Teachers can access evaluations when HOD has published questions
    // Check if published questions exist for each term
    const startQuestionsExist = await prisma.question.count({
      where: {
        departmentId: session.user.departmentId,
        term: 'START',
        isActive: true,
        isPublished: true
      }
    }) > 0
    
    const endQuestionsExist = await prisma.question.count({
      where: {
        departmentId: session.user.departmentId,
        term: 'END',
        isActive: true,
        isPublished: true
      }
    }) > 0

    // Resolve deadlines from terms
    let startTermDeadline: string | null = null
    let endTermDeadline: string | null = null
    
    const startTermRow = await prisma.term.findFirst({
      where: {
        status: 'START',
        departments: { some: { id: session.user.departmentId } }
      },
      select: { endDate: true }
    })
    if (startTermRow?.endDate) {
      startTermDeadline = startTermRow.endDate.toISOString()
    }

    const endTermRow = await prisma.term.findFirst({
      where: {
        status: 'END',
        departments: { some: { id: session.user.departmentId } }
      },
      select: { endDate: true }
    })
    if (endTermRow?.endDate) {
      endTermDeadline = endTermRow.endDate.toISOString()
    }

    const startQuestionsCount = startQuestionsExist ? await prisma.question.count({
      where: {
        departmentId: session.user.departmentId,
        term: 'START',
        isActive: true,
        isPublished: true
      }
    }) : 0

    const endQuestionsCount = endQuestionsExist ? await prisma.question.count({
      where: {
        departmentId: session.user.departmentId,
        term: 'END',
        isActive: true,
        isPublished: true
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

    return NextResponse.json({
      activeTerm: termState?.activeTerm || null,
      start: {
        status: startStatus,
        questionsCount: startQuestionsCount,
        answersCount: startAnswersCount,
        hasSelfComment: !!startSelfComment,
        canSubmit: startQuestionsExist && startStatus !== 'SUBMITTED' && (!!startTermDeadline && nowIso <= startTermDeadline),
        deadline: startTermDeadline,
        isPublished: startQuestionsExist
      },
      end: {
        status: endStatus,
        questionsCount: endQuestionsCount,
        answersCount: endAnswersCount,
        hasSelfComment: !!endSelfComment,
        canSubmit: endQuestionsExist && endStatus !== 'SUBMITTED' && (!!endTermDeadline && nowIso <= endTermDeadline),
        deadline: endTermDeadline,
        isPublished: endQuestionsExist
      }
    })
  } catch (error) {
    console.error('Error fetching evaluation status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
