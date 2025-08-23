import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Save draft answers (partial upsert). Does not submit/lock the evaluation.
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { term, answers } = await request.json()
    if (!term || !['START', 'END'].includes(term)) {
      return NextResponse.json({ error: 'Valid term is required' }, { status: 400 })
    }
    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Answers array is required' }, { status: 400 })
    }

    // If already submitted (all questions answered and self-comment exists), block editing
    const currentYear = new Date().getFullYear()
    const [questionsCount, existingAnswersCount, selfComment] = await Promise.all([
      prisma.question.count({ 
        where: { 
          departmentId: session.user.departmentId, 
          term: term as 'START' | 'END',
          year: currentYear
        } 
      }),
      prisma.teacherAnswer.count({ 
        where: { 
          teacherId: session.user.id, 
          term: term as 'START' | 'END',
          year: currentYear
        } 
      }),
      prisma.selfComment.findUnique({ 
        where: { 
          teacherId_term_year: { 
            teacherId: session.user.id, 
            term: term as 'START' | 'END', 
            year: currentYear 
          } 
        } 
      }),
    ])
    const isSubmitted = questionsCount > 0 && existingAnswersCount === questionsCount && !!selfComment
    if (isSubmitted) {
      return NextResponse.json({ error: 'Evaluation already submitted and locked' }, { status: 400 })
    }

    // Resolve termId for current year/department (best-effort)
    let resolvedTermId: string | null = null
    try {
      const currentYear = new Date().getFullYear()
      const termMatch = await prisma.term.findFirst({
        where: { year: currentYear, departments: { some: { id: session.user.departmentId || undefined } } },
        select: { id: true },
      })
      resolvedTermId = termMatch?.id || null
    } catch {}

    // Upsert each answer (composite unique)
    const currentYear = new Date().getFullYear()
    await prisma.$transaction(
      answers.map((a: { questionId: string; answer: string }) =>
        prisma.teacherAnswer.upsert({
          where: {
            teacherId_questionId_term_year: {
              teacherId: session.user.id,
              questionId: a.questionId,
              term: term as 'START' | 'END',
              year: currentYear,
            },
          },
          update: { answer: a.answer, termId: resolvedTermId },
          create: {
            teacherId: session.user.id,
            questionId: a.questionId,
            term: term as 'START' | 'END',
            year: currentYear,
            answer: a.answer,
            termId: resolvedTermId,
          },
        })
      )
    )

    return NextResponse.json({ message: 'Draft saved' })
  } catch (error) {
    console.error('Error saving draft answers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

