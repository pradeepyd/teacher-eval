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

    if (teacherId && term) {
      // Get specific review
      const review = await prisma.hodReview.findUnique({
        where: {
          teacherId_term: {
            teacherId,
            term: term as 'START' | 'END'
          }
        },
        include: {
          teacher: {
            include: {
              department: true
            }
          }
        }
      })

      if (!review) {
        return NextResponse.json({ error: 'Review not found' }, { status: 404 })
      }

      if (review.teacher.departmentId !== session.user.departmentId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      return NextResponse.json(review)
    }

    // Get all pending reviews for HOD's department
    const pendingTeachers = await prisma.user.findMany({
      where: {
        role: 'TEACHER',
        departmentId: session.user.departmentId,
        teacherAnswers: {
          some: {
            term: term ? (term as 'START' | 'END') : undefined
          }
        }
      },
      include: {
        department: true,
        selfComments: {
          where: {
            term: term ? (term as 'START' | 'END') : undefined
          }
        },
        receivedHodReviews: {
          where: {
            term: term ? (term as 'START' | 'END') : undefined
          }
        },
        _count: {
          select: {
            teacherAnswers: {
              where: {
                term: term ? (term as 'START' | 'END') : undefined
              }
            }
          }
        }
      }
    })

    return NextResponse.json(pendingTeachers)
  } catch (error) {
    console.error('Error fetching HOD reviews:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'HOD') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { teacherId, comment, score, term, scores } = body
    // Block if Dean has finalized for this teacher/term
    const finalized = await prisma.finalReview.findUnique({
      where: { teacherId_term: { teacherId, term: term as 'START' | 'END' } }
    })
    if (finalized?.submitted) {
      return NextResponse.json({ error: 'Final review already submitted by Dean for this term' }, { status: 400 })
    }

    if (!teacherId || !comment || !term || !['START', 'END'].includes(term)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify teacher belongs to HOD's department
    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
      include: { department: true }
    })

    if (!teacher || teacher.departmentId !== session.user.departmentId) {
      return NextResponse.json({ error: 'Teacher not found or unauthorized' }, { status: 404 })
    }

    // Check if teacher has submitted their evaluation
    const teacherAnswers = await prisma.teacherAnswer.findMany({
      where: {
        teacherId,
        term: term as 'START' | 'END'
      }
    })

    const selfComment = await prisma.selfComment.findUnique({
      where: {
        teacherId_term: {
          teacherId,
          term: term as 'START' | 'END'
        }
      }
    })

    if (teacherAnswers.length === 0 || !selfComment) {
      return NextResponse.json({ error: 'Teacher has not completed their evaluation' }, { status: 400 })
    }

    // Resolve termId for linkage
    const termRecord = await prisma.term.findFirst({ where: { year: new Date().getFullYear() }, select: { id: true } })

    // Create or update HOD review
    // Prefer structured scores from payload; fall back to simple score
    const structuredScores = scores && typeof scores === 'object' ? scores : { totalScore: Number(score) || 0 }

    const review = await prisma.hodReview.upsert({
      where: {
        teacherId_term: {
          teacherId,
          term: term as 'START' | 'END'
        }
      },
      update: {
        comments: comment,
        scores: structuredScores,
        submitted: true,
        reviewerId: session.user.id,
        termId: termRecord?.id || null
      },
      create: {
        teacherId,
        term: term as 'START' | 'END',
        comments: comment,
        scores: structuredScores,
        submitted: true,
        reviewerId: session.user.id,
        termId: termRecord?.id || null
      }
    })

    return NextResponse.json({ 
      message: 'HOD review submitted successfully',
      review 
    })
  } catch (error) {
    console.error('Error submitting HOD review:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
