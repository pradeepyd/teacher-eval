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

    // Get questions count for each term
    const startQuestionsCount = await prisma.question.count({
      where: {
        departmentId: session.user.departmentId,
        term: 'START'
      }
    })

    const endQuestionsCount = await prisma.question.count({
      where: {
        departmentId: session.user.departmentId,
        term: 'END'
      }
    })

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

    return NextResponse.json({
      activeTerm: termState?.activeTerm || null,
      start: {
        status: startStatus,
        questionsCount: startQuestionsCount,
        answersCount: startAnswersCount,
        hasSelfComment: !!startSelfComment,
        canSubmit: termState?.activeTerm === 'START' && startStatus !== 'SUBMITTED'
      },
      end: {
        status: endStatus,
        questionsCount: endQuestionsCount,
        answersCount: endAnswersCount,
        hasSelfComment: !!endSelfComment,
        canSubmit: termState?.activeTerm === 'END' && endStatus !== 'SUBMITTED'
      }
    })
  } catch (error) {
    console.error('Error fetching evaluation status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}