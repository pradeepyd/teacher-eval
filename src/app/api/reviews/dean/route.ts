import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'DEAN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get('teacherId')
    const term = searchParams.get('term')

    if (teacherId && term) {
      // Get specific final review
      const review = await prisma.finalReview.findUnique({
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
        return NextResponse.json({ error: 'Final review not found' }, { status: 404 })
      }

      return NextResponse.json(review)
    }

    // Get all teachers with completed Assistant Dean reviews
    const teachersWithAsstReviews = await prisma.user.findMany({
      where: {
        role: 'TEACHER',
        receivedAsstReviews: {
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
            submitted: true,
            term: term ? (term as 'START' | 'END') : undefined
          }
        },
        receivedFinalReviews: {
          where: {
            term: term ? (term as 'START' | 'END') : undefined
          }
        }
      }
    })

    return NextResponse.json(teachersWithAsstReviews)
  } catch (error) {
    console.error('Error fetching Dean reviews:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'DEAN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { teacherId, comment, score, promoted, term } = await request.json()

    if (!teacherId || !comment || !score || promoted === undefined || !term || !['START', 'END'].includes(term)) {
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

    // Check if Assistant Dean has reviewed
    const asstReview = await prisma.asstReview.findUnique({
      where: {
        teacherId_term: {
          teacherId,
          term: term as 'START' | 'END'
        }
      }
    })

    if (!asstReview || !asstReview.submitted) {
      return NextResponse.json({ error: 'Assistant Dean review not completed' }, { status: 400 })
    }

    // Block re-finalization: Dean can finalize only once per teacher/term
    const existingFinal = await prisma.finalReview.findUnique({
      where: { teacherId_term: { teacherId, term: term as 'START' | 'END' } }
    })
    if (existingFinal?.submitted) {
      return NextResponse.json({ error: 'Final review already submitted for this term' }, { status: 400 })
    }

    // Determine status based on promotion
    const status = promoted ? 'PROMOTED' : 'ON_HOLD'

    // Resolve termId for linkage
    const termRecord = await prisma.term.findFirst({ where: { year: new Date().getFullYear() }, select: { id: true } })

    // Create or update final review
    const review = await prisma.finalReview.upsert({
      where: {
        teacherId_term: {
          teacherId,
          term: term as 'START' | 'END'
        }
      },
      update: {
        finalComment: comment,
        finalScore: score,
        status,
        submitted: true,
        reviewerId: session.user.id,
        termId: termRecord?.id || null
      },
      create: {
        teacherId,
        term: term as 'START' | 'END',
        finalComment: comment,
        finalScore: score,
        status,
        submitted: true,
        reviewerId: session.user.id,
        termId: termRecord?.id || null
      }
    })

    return NextResponse.json({ 
      message: 'Dean review submitted successfully',
      review 
    })
  } catch (error) {
    console.error('Error submitting Dean review:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
