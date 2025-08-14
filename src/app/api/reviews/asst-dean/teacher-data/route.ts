import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
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
        }
      }
    })

    // Transform data for frontend (support legacy numeric scores and new structured object)
    const extractHod = (review: any) => {
      let total = 0
      let questionScores: Record<string, number> = {}
      let rubric: Record<string, number> = {}
      if (review && review.scores !== undefined && review.scores !== null) {
        const s: any = review.scores
        if (typeof s === 'number') {
          total = s
        } else if (typeof s === 'object') {
          if (typeof s.totalScore === 'number') total = s.totalScore
          else if (typeof (s as any).score === 'number') total = (s as any).score
          questionScores = (s.questionScores as any) || {}
          rubric = (s.rubric as any) || {}
        }
      }
      return { total, questionScores, rubric }
    }

    const teachersData = teachers.map(teacher => {
      const startAnswers = teacher.teacherAnswers.filter(a => a.term === 'START')
      const endAnswers = teacher.teacherAnswers.filter(a => a.term === 'END')
      const startSelfComment = teacher.selfComments.find(c => c.term === 'START')
      const endSelfComment = teacher.selfComments.find(c => c.term === 'END')
      const startHodReview = teacher.receivedHodReviews.find(r => r.term === 'START')
      const endHodReview = teacher.receivedHodReviews.find(r => r.term === 'END')
      const startAsstReview = teacher.receivedAsstReviews.find(r => r.term === 'START')
      const endAsstReview = teacher.receivedAsstReviews.find(r => r.term === 'END')

      const startHod = extractHod(startHodReview)
      const endHod = extractHod(endHodReview)

      return {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        department: teacher.department?.name || 'N/A',
        status: startAsstReview ? 'REVIEWED' : 'PENDING',
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
          START: startHod.total,
          END: endHod.total
        },
        hodQuestionScores: {
          START: startHod.questionScores,
          END: endHod.questionScores
        },
        hodRubric: {
          START: startHod.rubric,
          END: endHod.rubric
        },
        asstDeanComment: {
          START: startAsstReview?.comments || '',
          END: endAsstReview?.comments || ''
        },
        asstDeanScore: {
          START: (startAsstReview?.scores as any)?.totalScore || 0,
          END: (endAsstReview?.scores as any)?.totalScore || 0
        },
        canReview: !startAsstReview || !endAsstReview
      }
    })

    return NextResponse.json({ teachers: teachersData })
  } catch (error) {
    console.error('Error fetching teacher data for Assistant Dean review:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
