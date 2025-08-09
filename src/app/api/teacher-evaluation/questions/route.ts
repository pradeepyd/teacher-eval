import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const term = searchParams.get('term')

    if (!term || !['START', 'END'].includes(term)) {
      return NextResponse.json({ error: 'Valid term is required' }, { status: 400 })
    }

    // Ensure department term is published
    const termState = await prisma.termState.findUnique({ where: { departmentId: session.user.departmentId } })
    if (!termState || termState.activeTerm !== term || termState.visibility !== 'PUBLISHED') {
      return NextResponse.json({ questions: [], existingSelfComment: '', isSubmitted: false, canEdit: false })
    }

    // Get all questions for this department and term (published only)
    const questions = await prisma.question.findMany({
      where: {
        departmentId: session.user.departmentId,
        term: term as 'START' | 'END',
        isActive: true
      },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    // Get existing answers for this teacher and term
    const existingAnswers = await prisma.teacherAnswer.findMany({
      where: {
        teacherId: session.user.id,
        term: term as 'START' | 'END'
      }
    })

    // Get existing self comment
    const selfComment = await prisma.selfComment.findUnique({
      where: {
        teacherId_term: {
          teacherId: session.user.id,
          term: term as 'START' | 'END'
        }
      }
    })

    // Map answers to questions
    const questionsWithAnswers = questions.map(question => {
      const existingAnswer = existingAnswers.find(answer => answer.questionId === question.id)
      return {
        ...question,
        existingAnswer: existingAnswer?.answer || ''
      }
    })

    const isSubmitted = existingAnswers.length === questions.length && selfComment !== null

    return NextResponse.json({
      questions: questionsWithAnswers,
      existingSelfComment: selfComment?.comment || '',
      isSubmitted,
      canEdit: !isSubmitted
    })
  } catch (error) {
    console.error('Error fetching evaluation questions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
