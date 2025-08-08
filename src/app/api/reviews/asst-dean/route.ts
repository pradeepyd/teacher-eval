import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ASST_DEAN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get('teacherId')
    const term = searchParams.get('term')

    if (teacherId && term) {
      // Get specific review
      const review = await prisma.asstReview.findUnique({
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

      return NextResponse.json(review)
    }

    // Get all teachers with completed HOD reviews
    const teachersWithHodReviews = await prisma.user.findMany({
      where: {
        role: 'TEACHER',
        receivedHodReviews: {
          some: {
            submitted: true,
            term: term ? (term as 'START' | 'END') : undefined
          }
        }
      },
      include: {
        department: true,
        receivedHodReviews: {
          where: {
            submitted: true,
            term: term ? (term as 'START' | 'END') : undefined
          }
        },
        receivedAsstReviews: {
          where: {
            term: term ? (term as 'START' | 'END') : undefined
          }
        }
      }
    })

    return NextResponse.json(teachersWithHodReviews)
  } catch (error) {
    console.error('Error fetching Assistant Dean reviews:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ASST_DEAN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { teacherId, comment, score, term } = await request.json()

    if (!teacherId || !comment || !score || !term || !['START', 'END'].includes(term)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify teacher exists
    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
      include: { department: true }
    })

    if (!teacher || teacher.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
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

    // Check if HOD has reviewed
    const hodReview = await prisma.hodReview.findUnique({
      where: {
        teacherId_term: {
          teacherId,
          term: term as 'START' | 'END'
        }
      }
    })

    if (!hodReview || !hodReview.submitted) {
      return NextResponse.json({ error: 'HOD review not completed' }, { status: 400 })
    }

    // Resolve termId for linkage
    const termRecord = await prisma.term.findFirst({ where: { year: new Date().getFullYear() }, select: { id: true } })

    // Create or update Assistant Dean review
    const review = await prisma.asstReview.upsert({
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
        reviewerId: session.user.id,
        termId: termRecord?.id || null
      },
      create: {
        teacherId,
        term: term as 'START' | 'END',
        comments: comment,
        scores: { totalScore: score },
        submitted: true,
        reviewerId: session.user.id,
        termId: termRecord?.id || null
      }
    })

    return NextResponse.json({ 
      message: 'Assistant Dean review submitted successfully',
      review 
    })
  } catch (error) {
    console.error('Error submitting Assistant Dean review:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}