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
    const teacherId = searchParams.get('teacherId')
    const term = searchParams.get('term')

    if (teacherId && term) {
      // Get specific review
      const review = await prisma.asstReview.findUnique({
        where: {
          teacherId_term_year: {
            teacherId,
            term: term as 'START' | 'END',
            year: new Date().getFullYear()
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

    // Get all teachers with completed HOD reviews AND all HODs
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

    // Get all HODs (they can be reviewed by Assistant Dean)
    const hods = await prisma.user.findMany({
      where: {
        role: 'HOD'
      },
      include: {
        department: true,
        receivedAsstReviews: {
          where: {
            term: term ? (term as 'START' | 'END') : undefined
          }
        }
      }
    })

    // Combine teachers and HODs
    const allStaff = [...teachersWithHodReviews, ...hods]

    return NextResponse.json(allStaff)
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
    // Block if Dean has finalized for this teacher/term
    const finalized = await prisma.finalReview.findUnique({
      where: { 
        teacherId_term_year: { 
          teacherId, 
          term: term as 'START' | 'END',
          year: new Date().getFullYear()
        } 
      }
    })
    if (finalized?.submitted) {
      return NextResponse.json({ error: 'Final review already submitted by Dean for this term' }, { status: 400 })
    }

    if (!teacherId || !comment || !score || !term || !['START', 'END'].includes(term)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify staff member exists (can be teacher or HOD)
    const staffMember = await prisma.user.findUnique({
      where: { id: teacherId },
      include: { department: true }
    })

    if (!staffMember || !['TEACHER', 'HOD'].includes(staffMember.role)) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    // Check if staff member has submitted their evaluation
    // For teachers: check teacherAnswers and selfComment
    // For HODs: check if they have been reviewed by HOD (which is themselves, so skip this check)
    let hasSubmittedEvaluation = true
    
    if (staffMember.role === 'TEACHER') {
      const teacherAnswers = await prisma.teacherAnswer.findMany({
        where: {
          teacherId,
          term: term as 'START' | 'END'
        }
      })

      const selfComment = await prisma.selfComment.findUnique({
        where: { 
          teacherId_term_year: { 
            teacherId, 
            term: term as 'START' | 'END',
            year: new Date().getFullYear()
          } 
        }
      })

      hasSubmittedEvaluation = teacherAnswers.length > 0 && !!selfComment
    }

    if (!hasSubmittedEvaluation) {
      return NextResponse.json({ error: 'Staff member has not completed their evaluation' }, { status: 400 })
    }

    // Check if HOD has reviewed (only for teachers, not for HODs themselves)
    if (staffMember.role === 'TEACHER') {
      const hodReview = await prisma.hodReview.findUnique({
        where: { 
          teacherId_term_year: { 
            teacherId, 
            term: term as 'START' | 'END',
            year: new Date().getFullYear()
          } 
        }
      })

      if (!hodReview || !hodReview.submitted) {
        return NextResponse.json({ error: 'HOD review is required before Assistant Dean review' }, { status: 400 })
      }
    }

    // Resolve termId for linkage
    const termRecord = await prisma.term.findFirst({ where: { year: new Date().getFullYear() }, select: { id: true } })

    // Create or update Assistant Dean review
    const review = await prisma.asstReview.upsert({
      where: {
        teacherId_term_year: {
          teacherId,
          term: term as 'START' | 'END',
          year: new Date().getFullYear()
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
        year: new Date().getFullYear(),
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
