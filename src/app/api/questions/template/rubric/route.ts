import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Insert a standard rubric (from evaluation.md) as MCQ 1–5 questions for the HOD's department and active term
export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'HOD') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const departmentId = session.user.departmentId
    if (!departmentId) {
      return NextResponse.json({ error: 'HOD does not have a department' }, { status: 400 })
    }

    // Ensure active term exists
    const termState = await prisma.termState.findUnique({ 
      where: { 
        departmentId_year: {
          departmentId,
          year: new Date().getFullYear()
        }
      } 
    })
    if (!termState || !termState.activeTerm) {
      return NextResponse.json({ error: 'No active term set for your department' }, { status: 400 })
    }

    const activeTerm = termState.activeTerm as 'START' | 'END'

    // Rubric items derived from evaluation.md (Sections B, C, D)
    const rubricItems: string[] = [
      // B. Professionalism
      '[Professionalism] Compliance',
      '[Professionalism] Punctuality/Attendance',
      '[Professionalism] Ability to deal with students',
      '[Professionalism] Competence and Performance',
      // C. College Responsibilities
      '[Responsibilities] Attending Non-Teaching Activities',
      '[Responsibilities] Department Related Duties',
      '[Responsibilities] Collegial Relationship',
      '[Responsibilities] Ability to Deal with Supervisors',
      '[Responsibilities] Participation in College Committees',
      // D. Professional Development
      '[Development] In-Service Training',
      '[Development] Research and Publications',
      '[Development] National and International Conferences',
      // E. Student and Community Engagement
      '[Engagement] Student Advising',
      '[Engagement] Student Engagement',
      '[Engagement] Community Engagement',
    ]

    // Options 1–5, numeric and straightforward for both teacher and reviewer
    const options = ['1', '2', '3', '4', '5']
    const optionScores = [1, 2, 3, 4, 5]

    // Avoid duplicating if they already exist for the active term
    const existing = await prisma.question.findMany({
      where: {
        departmentId,
        term: activeTerm,
      },
      select: { id: true, question: true },
    })
    const existingTexts = new Set(existing.map(q => q.question))

    const toCreate = rubricItems
      .filter(text => !existingTexts.has(text))
      .map((text, idx) => ({
        departmentId,
        year: new Date().getFullYear(),
        term: activeTerm,
        type: 'MCQ' as const,
        question: text,
        options,
        optionScores,
        order: (existing.length + idx + 1),
      }))

    if (toCreate.length === 0) {
      return NextResponse.json({ message: 'Rubric already present for this term', created: 0 })
    }

    await prisma.$transaction(
      toCreate.map((data) => prisma.question.create({ data }))
    )

    return NextResponse.json({ message: 'Rubric template inserted', created: toCreate.length })
  } catch (error) {
    console.error('Error inserting rubric template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


