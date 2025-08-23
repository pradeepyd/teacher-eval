import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createSuccessResponse, createApiErrorResponse, createUnauthorizedResponse } from '@/lib/api-response'
import { batchFetchQuestions, batchFetchTeacherAnswers } from '@/lib/api-performance'

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'TEACHER') {
      return createUnauthorizedResponse()
    }

    const currentYear = new Date().getFullYear()
    const terms: ('START' | 'END')[] = ['START', 'END']
    
    // Get department's active term
    const termState = await prisma.termState.findUnique({ 
      where: { 
        departmentId_year: {
          departmentId: session.user.departmentId,
          year: currentYear
        }
      } 
    })

    // Use batch queries to optimize performance
    // Fetch all questions for both terms in a single query
    const questionsByTerm = await batchFetchQuestions(
      session.user.departmentId,
      terms,
      true // includePublished = true
    )
    
    // Fetch all teacher answers for both terms in a single query
    const answersByTerm = await batchFetchTeacherAnswers(
      session.user.id,
      terms
    )
    
    // Get term deadlines in parallel
    const [startTermRow, endTermRow] = await Promise.all([
      prisma.term.findFirst({
        where: {
          status: 'START',
          departments: { some: { id: session.user.departmentId } }
        },
        select: { endDate: true }
      }),
      prisma.term.findFirst({
        where: {
          status: 'END',
          departments: { some: { id: session.user.departmentId } }
        },
        select: { endDate: true }
      })
    ])
    
    // Extract data from batch results
    const startQuestions = questionsByTerm.START || []
    const endQuestions = questionsByTerm.END || []
    const startAnswers = answersByTerm.START || []
    const endAnswers = answersByTerm.END || []
    
    const startQuestionsExist = startQuestions.length > 0
    const endQuestionsExist = endQuestions.length > 0
    const startQuestionsCount = startQuestions.length
    const endQuestionsCount = endQuestions.length
    
    // Count unique answered questions (not total answer records)
    // Only count answers that correspond to questions we actually found
    const startQuestionIds = new Set(startQuestions.map(q => q.id))
    const endQuestionIds = new Set(endQuestions.map(q => q.id))
    
    const startAnswersCount = startAnswers.length > 0 ? 
      startAnswers.filter(a => startQuestionIds.has(a.questionId)).length : 0
    const endAnswersCount = endAnswers.length > 0 ? 
      endAnswers.filter(a => endQuestionIds.has(a.questionId)).length : 0
    

    
    // Resolve deadlines
    const startTermDeadline = startTermRow?.endDate?.toISOString() || null
    const endTermDeadline = endTermRow?.endDate?.toISOString() || null

    const startSelfComment = await prisma.selfComment.findUnique({
      where: {
        teacherId_term_year: {
          teacherId: session.user.id,
          term: 'START',
          year: new Date().getFullYear()
        },
        submitted: true
      }
    })

    const endSelfComment = await prisma.selfComment.findUnique({
      where: {
        teacherId_term_year: {
          teacherId: session.user.id,
          term: 'END',
          year: new Date().getFullYear()
        },
        submitted: true
      }
    })

    // Check if Dean has finalized the review for each term
    const startFinalReview = await prisma.finalReview.findUnique({
      where: {
        teacherId_term_year: {
          teacherId: session.user.id,
          term: 'START',
          year: new Date().getFullYear()
        }
      }
    })

    const endFinalReview = await prisma.finalReview.findUnique({
      where: {
        teacherId_term_year: {
          teacherId: session.user.id,
          term: 'END',
          year: new Date().getFullYear()
        }
      }
    })

    // Determine status for each term
    const getTermStatus = (questionsCount: number, answersCount: number, hasSelfComment: boolean, hasFinalReview: boolean) => {
      if (questionsCount === 0) return 'NOT_AVAILABLE'
      if (answersCount === 0) return 'NOT_STARTED'
      // Ensure answersCount never exceeds questionsCount for status determination
      const safeAnswersCount = Math.min(answersCount, questionsCount)
      if (safeAnswersCount === questionsCount && hasSelfComment) {
        return hasFinalReview ? 'REVIEWED' : 'SUBMITTED'
      }
      return 'IN_PROGRESS'
    }

    const startStatus = getTermStatus(startQuestionsCount, startAnswersCount, !!startSelfComment, !!startFinalReview)
    const endStatus = getTermStatus(endQuestionsCount, endAnswersCount, !!endSelfComment, !!endFinalReview)



    const nowIso = new Date().toISOString()

    return createSuccessResponse({
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
    return createApiErrorResponse(error, {
      operation: 'fetch evaluation status',
      component: 'TeacherEvaluationStatusAPI'
    })
  }
}
