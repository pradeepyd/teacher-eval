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
    const departmentId = searchParams.get('departmentId')

    if (!departmentId) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 })
    }

    // Get all teachers in the department with their evaluation data
    const teachers = await prisma.user.findMany({
      where: {
        role: 'TEACHER',
        departmentId
      },
      include: {
        department: true,
        teacherAnswers: {
          include: {
            question: true
          },
          orderBy: {
            question: {
              order: 'asc'
            }
          }
        },
        selfComments: true,
        receivedHodReviews: {
          where: {
            submitted: true
          }
        },
        receivedAsstReviews: {
          where: {
            submitted: true
          }
        },
        receivedFinalReviews: {
          where: {
            submitted: true
          }
        }
      }
    })

    // Transform data for frontend
    const teachersData = teachers.map(teacher => {
      const startAnswers = teacher.teacherAnswers.filter(a => a.term === 'START')
      const endAnswers = teacher.teacherAnswers.filter(a => a.term === 'END')
      const startSelfComment = teacher.selfComments.find(c => c.term === 'START')
      const endSelfComment = teacher.selfComments.find(c => c.term === 'END')
      const startHodReview = teacher.receivedHodReviews.find(r => r.term === 'START')
      const endHodReview = teacher.receivedHodReviews.find(r => r.term === 'END')
      const startAsstReview = teacher.receivedAsstReviews.find(r => r.term === 'START')
      const endAsstReview = teacher.receivedAsstReviews.find(r => r.term === 'END')
      const startFinalReview = teacher.receivedFinalReviews.find(r => r.term === 'START')
      const endFinalReview = teacher.receivedFinalReviews.find(r => r.term === 'END')

      return {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        department: teacher.department?.name || 'N/A',
        status: 'PENDING', // Status will be determined by the current term being reviewed
        teacherAnswers: {
          START: startAnswers,
          END: endAnswers
        },
        selfComment: {
          START: startSelfComment?.comment || '',
          END: endSelfComment?.comment || ''
        },
        hodComment: {
          START: startHodReview?.comments || '',
          END: endHodReview?.comments || ''
        },
        hodScore: {
          START: (startHodReview?.scores as any)?.overallRating || 0,
          END: (endHodReview?.scores as any)?.overallRating || 0
        },
        receivedHodReviews: {
          START: startHodReview ? {
            id: startHodReview.id,
            term: startHodReview.term,
            comments: startHodReview.comments,
            scores: startHodReview.scores,
            submitted: startHodReview.submitted
          } : null,
          END: endHodReview ? {
            id: endHodReview.id,
            term: endHodReview.term,
            comments: endHodReview.comments,
            scores: endHodReview.scores,
            submitted: endHodReview.submitted
          } : null
        },
        asstDeanComment: {
          START: startAsstReview?.comments || '',
          END: endAsstReview?.comments || ''
        },
        asstDeanScore: {
          START: (startAsstReview?.scores as any)?.totalScore || 0,
          END: (endAsstReview?.scores as any)?.totalScore || 0
        },
        deanComment: {
          START: startFinalReview?.finalComment || '',
          END: endFinalReview?.finalComment || ''
        },
        finalScore: {
          START: startFinalReview?.finalScore || 0,
          END: endFinalReview?.finalScore || 0
        },
        receivedFinalReviews: {
          START: startFinalReview ? {
            id: startFinalReview.id,
            term: startFinalReview.term,
            finalComment: startFinalReview.finalComment,
            finalScore: startFinalReview.finalScore,
            status: startFinalReview.status,
            submitted: startFinalReview.submitted
          } : null,
          END: endFinalReview ? {
            id: endFinalReview.id,
            term: endFinalReview.term,
            finalComment: endFinalReview.finalComment,
            finalScore: endFinalReview.finalScore,
            status: endFinalReview.status,
            submitted: endFinalReview.submitted
          } : null
        },
        promoted: {
          START: startFinalReview?.status === 'PROMOTED',
          END: endFinalReview?.status === 'PROMOTED'
        },
        canReview: true // Dean can always review teachers, status will be determined by current term
      }
    })

    return NextResponse.json({ teachers: teachersData })
  } catch (error) {
    console.error('Error fetching teacher data for Dean review:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
