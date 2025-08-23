import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['ADMIN', 'DEAN', 'ASST_DEAN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const staffId = searchParams.get('staffId')
    const term = searchParams.get('term')
    const role = searchParams.get('role')

    if (!staffId || !term || !['START', 'END'].includes(term)) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const currentYear = new Date().getFullYear()

    let evaluationData: any = {}

    if (role === 'TEACHER') {
      // Get teacher's evaluation data for the specific term
      
      // Get HOD review
      const hodReview = await prisma.hodReview.findFirst({
        where: {
          teacherId: staffId,
          term: term as 'START' | 'END',
          year: currentYear
        }
      })

      // Get Assistant Dean review
      const asstDeanReview = await prisma.asstReview.findFirst({
        where: {
          teacherId: staffId,
          term: term as 'START' | 'END',
          year: currentYear
        }
      })

      // Get Dean final review
      const deanReview = await prisma.finalReview.findFirst({
        where: {
          teacherId: staffId,
          term: term as 'START' | 'END',
          year: currentYear
        }
      })

      // Parse scores if they're stored as JSON strings
      const hodScores = hodReview?.scores ? 
        (typeof hodReview.scores === 'string' ? JSON.parse(hodReview.scores) : hodReview.scores) : null
      const asstDeanScores = asstDeanReview?.scores ? 
        (typeof asstDeanReview.scores === 'string' ? JSON.parse(asstDeanReview.scores) : hodReview.scores) : null

      evaluationData = {
        hodComment: hodReview?.comments || null,
        hodScore: hodScores?.overallRating || hodScores?.score || hodScores?.rating || null,
        hodTotalScore: hodScores?.totalScore || null,
        asstDeanComment: asstDeanReview?.comments || null,
        asstDeanScore: asstDeanScores?.totalScore || null,
        deanComment: deanReview?.finalComment || null,
        finalScore: deanReview?.finalScore || null,
        promoted: deanReview?.status === 'PROMOTED' || null
      }
              } else if (role === 'HOD') {
       // Get HOD's performance review data for the specific term
       
       // HODs DO go through Assistant Dean review before Dean finalization
       // Get Assistant Dean review for HOD
       const asstDeanReview = await prisma.asstReview.findFirst({
         where: {
           teacherId: staffId, // HODs are stored as teachers in asstReview
           term: term as 'START' | 'END',
           year: currentYear
         }
       })

       // Get Dean performance review for HOD
       const deanReview = await prisma.hodPerformanceReview.findFirst({
         where: {
           hodId: staffId,
           term: term as 'START' | 'END',
           year: currentYear,
           submitted: true // Only get submitted reviews
         },
         include: {
           reviewer: true
         }
       })



       evaluationData = {
         hodComment: null, // HODs don't have HOD reviews
         hodScore: null,
         hodTotalScore: null,
         asstDeanComment: asstDeanReview?.comments || null,
         asstDeanScore: asstDeanReview?.scores?.totalScore || null,
         deanComment: deanReview?.comments || null,
         finalScore: deanReview?.totalScore || null,
         promoted: deanReview?.status === 'PROMOTED' || null
       }



            }

     return NextResponse.json(evaluationData)

  } catch (error) {
    console.error('Error fetching detailed evaluation data:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
