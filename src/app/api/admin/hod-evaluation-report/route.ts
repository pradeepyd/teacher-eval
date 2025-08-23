import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { hodId, term } = await request.json()

    if (!hodId || !term || !['START', 'END'].includes(term)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    // Get HOD's evaluation data for the specific term
    // Get Assistant Dean review (HODs are reviewed by Assistant Deans)
    const asstDeanReview = await prisma.hodPerformanceReview.findFirst({
      where: {
        hodId: hodId,
        term: term as 'START' | 'END',
        year: new Date().getFullYear(),
        reviewer: {
          role: 'ASST_DEAN'
        }
      },
      include: {
        reviewer: {
          select: {
            name: true
          }
        }
      }
    })

    // Get Dean final review (HODs are also reviewed by Deans)
    const deanReview = await prisma.hodPerformanceReview.findFirst({
      where: {
        hodId: hodId,
        term: term as 'START' | 'END',
        year: new Date().getFullYear(),
        reviewer: {
          role: 'DEAN'
        }
      },
      include: {
        reviewer: {
          select: {
            name: true
          }
        }
      }
    })

    // Calculate Assistant Dean score from rubric scores if totalScore is null
    let asstDeanScore = asstDeanReview?.totalScore
    if (!asstDeanScore && asstDeanReview?.scores) {
      const scores = asstDeanReview.scores as Record<string, number>
      const prof = Object.keys(scores).filter(k => k.startsWith('[Professionalism]'))
      const leader = Object.keys(scores).filter(k => k.startsWith('[Leadership]'))
      const dev = Object.keys(scores).filter(k => k.startsWith('[Development]'))
      const service = Object.keys(scores).filter(k => k.startsWith('[Service]'))
      
      const sum = (keys: string[]) => keys.reduce((acc, k) => acc + (scores[k] || 0), 0)
      const raw = sum(prof) + sum(leader) + sum(dev) + sum(service)
      const max = (prof.length + leader.length + dev.length + service.length) * 5
      
      asstDeanScore = max > 0 ? Math.round((raw / max) * 100) : null
    }

    // Prepare response data - EXACT same as HOD evaluation report API
    const evaluationData = {
      asstDeanComment: asstDeanReview?.comments || null,
      asstDeanScore: asstDeanScore,
      asstDeanName: asstDeanReview?.reviewer?.name || null,
      deanComment: deanReview?.comments || null,
      deanScore: deanReview?.status === 'PROMOTED' ? 100 : (deanReview?.totalScore || null),
      deanName: deanReview?.reviewer?.name || null,
      promoted: deanReview?.status === 'PROMOTED' || null
    }

    return NextResponse.json(evaluationData)

  } catch (error) {
    console.error('Error fetching admin HOD evaluation report data:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
