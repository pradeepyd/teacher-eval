import { NextRequest, NextResponse } from 'next/server'
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

    const { teacherId, comment, score, term } = await request.json()

    if (!teacherId || !comment || !score || !term || !['START', 'END'].includes(term)) {
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

    // Create or update HOD review
    const review = await prisma.hodReview.upsert({
      where: {
        teacherId_term: {
          teacherId,
          term: term as 'START' | 'END'
        }
      },
      update: {
        comments: comment,
        scores: { totalScore: score },
        submitted: true,
        reviewerId: session.user.id
      },
      create: {
        teacherId,
        term: term as 'START' | 'END',
        comments: comment,
        scores: { totalScore: score },
        submitted: true,
        reviewerId: session.user.id
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