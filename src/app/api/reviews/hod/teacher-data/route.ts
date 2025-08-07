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

    if (!teacherId || !term || !['START', 'END'].includes(term)) {
      return NextResponse.json({ error: 'Teacher ID and valid term are required' }, { status: 400 })
    }

    // Verify teacher belongs to HOD's department
    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
      include: { department: true }
    })

    if (!teacher || teacher.departmentId !== session.user.departmentId) {
      return NextResponse.json({ error: 'Teacher not found or unauthorized' }, { status: 404 })
    }

    // Get teacher's answers with questions
    const teacherAnswers = await prisma.teacherAnswer.findMany({
      where: {
        teacherId,
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

    // Get teacher's self comment
    const selfComment = await prisma.selfComment.findUnique({
      where: {
        teacherId_term: {
          teacherId,
          term: term as 'START' | 'END'
        }
      }
    })

    // Get existing HOD review
    const existingReview = await prisma.hodReview.findUnique({
      where: {
        teacherId_term: {
          teacherId,
          term: term as 'START' | 'END'
        }
      }
    })

    return NextResponse.json({
      teacher: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        department: teacher.department
      },
      answers: teacherAnswers,
      selfComment: selfComment?.comment || '',
      existingReview: existingReview || null,
      canEdit: !existingReview?.submitted
    })
  } catch (error) {
    console.error('Error fetching teacher data for HOD review:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}