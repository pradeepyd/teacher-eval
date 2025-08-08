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

    const { searchParams } = new URL(request.url)
    const term = searchParams.get('term')

    if (!term || !['START', 'END'].includes(term)) {
      return NextResponse.json({ error: 'Valid term is required' }, { status: 400 })
    }

    // Get teacher's answers for the specified term
    const answers = await prisma.teacherAnswer.findMany({
      where: {
        teacherId: session.user.id,
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

    // Get self comment for this term
    const selfComment = await prisma.selfComment.findUnique({
      where: {
        teacherId_term: {
          teacherId: session.user.id,
          term: term as 'START' | 'END'
        }
      }
    })

    return NextResponse.json({
      answers,
      selfComment: selfComment?.comment || '',
      submitted: answers.length > 0 && selfComment !== null
    })
  } catch (error) {
    console.error('Error fetching teacher answers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { answers, selfComment, term } = await request.json()

    if (!term || !['START', 'END'].includes(term)) {
      return NextResponse.json({ error: 'Valid term is required' }, { status: 400 })
    }

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Answers array is required' }, { status: 400 })
    }

    if (!selfComment || typeof selfComment !== 'string') {
      return NextResponse.json({ error: 'Self comment is required' }, { status: 400 })
    }

    // Check if teacher's department has this term as active
    const termState = await prisma.termState.findUnique({
      where: { departmentId: session.user.departmentId }
    })

    if (!termState || termState.activeTerm !== term) {
      return NextResponse.json({ 
        error: `Cannot submit evaluation for ${term} term. Current active term is ${termState?.activeTerm || 'not set'}` 
      }, { status: 400 })
    }

    // Check if already submitted
    const existingAnswers = await prisma.teacherAnswer.count({
      where: {
        teacherId: session.user.id,
        term: term as 'START' | 'END'
      }
    })

    if (existingAnswers > 0) {
      return NextResponse.json({ error: 'Evaluation already submitted for this term' }, { status: 400 })
    }

    // Get all questions for this department and term
    const questions = await prisma.question.findMany({
      where: {
        departmentId: session.user.departmentId,
        term: term as 'START' | 'END'
      }
    })

    if (questions.length === 0) {
      return NextResponse.json({ error: 'No questions available for this term' }, { status: 400 })
    }

    // Validate that all questions are answered
    const questionIds = questions.map(q => q.id)
    const answerQuestionIds = answers.map((a: { questionId: string }) => a.questionId)
    
    for (const questionId of questionIds) {
      if (!answerQuestionIds.includes(questionId)) {
        return NextResponse.json({ error: 'All questions must be answered' }, { status: 400 })
      }
    }

    // Resolve termId (if a matching Term exists for teacher's department and year)
    let resolvedTermId: string | null = null
    try {
      const currentYear = new Date().getFullYear()
      const termMatch = await prisma.term.findFirst({
        where: {
          year: currentYear,
          departments: { some: { id: session.user.departmentId || undefined } }
        },
        select: { id: true }
      })
      resolvedTermId = termMatch?.id || null
    } catch {}

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Save all answers
      const savedAnswers = await Promise.all(
        answers.map((answer: { questionId: string; answer: string }) =>
          tx.teacherAnswer.create({
            data: {
              teacherId: session.user.id,
              questionId: answer.questionId,
              term: term as 'START' | 'END',
              answer: answer.answer,
              termId: resolvedTermId,
            }
          })
        )
      )

      // Save self comment
      const savedSelfComment = await tx.selfComment.create({
        data: {
          teacherId: session.user.id,
          term: term as 'START' | 'END',
          comment: selfComment.trim(),
          termId: resolvedTermId,
        }
      })

      return { answers: savedAnswers, selfComment: savedSelfComment }
    })

    return NextResponse.json({ 
      message: 'Evaluation submitted successfully',
      ...result 
    }, { status: 201 })
  } catch (error) {
    console.error('Error submitting teacher answers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Save draft answers or update partial inputs
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { answers, selfComment, term } = await request.json()

    if (!term || !['START', 'END'].includes(term)) {
      return NextResponse.json({ error: 'Valid term is required' }, { status: 400 })
    }

    // Resolve termId
    let resolvedTermId: string | null = null
    try {
      const currentYear = new Date().getFullYear()
      const termMatch = await prisma.term.findFirst({
        where: {
          year: currentYear,
          departments: { some: { id: session.user.departmentId || undefined } }
        },
        select: { id: true }
      })
      resolvedTermId = termMatch?.id || null
    } catch {}

    // Save/Upsert answers if provided
    if (Array.isArray(answers)) {
      for (const a of answers) {
        if (!a?.questionId || typeof a?.answer !== 'string') continue
        await prisma.teacherAnswer.upsert({
          where: {
            teacherId_questionId_term: {
              teacherId: session.user.id,
              questionId: a.questionId,
              term: term as 'START' | 'END'
            }
          },
          update: { answer: a.answer, termId: resolvedTermId },
          create: {
            teacherId: session.user.id,
            questionId: a.questionId,
            term: term as 'START' | 'END',
            answer: a.answer,
            termId: resolvedTermId
          }
        })
      }
    }

    // Save/Upsert self comment if provided
    if (typeof selfComment === 'string') {
      await prisma.selfComment.upsert({
        where: {
          teacherId_term: {
            teacherId: session.user.id,
            term: term as 'START' | 'END'
          }
        },
        update: { comment: selfComment.trim(), termId: resolvedTermId },
        create: {
          teacherId: session.user.id,
          term: term as 'START' | 'END',
          comment: selfComment.trim(),
          termId: resolvedTermId
        }
      })
    }

    return NextResponse.json({ message: 'Draft saved' })
  } catch (error) {
    console.error('Error saving draft:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}