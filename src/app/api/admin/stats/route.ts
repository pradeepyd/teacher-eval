import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current year for active term filtering
    const currentYear = new Date().getFullYear()
    
    console.log('Admin stats API called for year:', currentYear)

    // Fetch all users with their roles and departments
    const users = await prisma.user.findMany({
      where: {
        role: { in: ['TEACHER', 'HOD', 'ASST_DEAN', 'DEAN'] }
      },
      include: {
        department: true
      }
    })
    
    console.log('Found users:', users.length)

    // Fetch all terms for the current year
    const currentYearTerms = await prisma.term.findMany({
      where: { year: currentYear }
    })
    
    console.log('Found terms for current year:', currentYearTerms.length)

    // If no terms exist for current year, return stats without term-based filtering
    if (currentYearTerms.length === 0) {
      console.log('No terms found for current year, using basic stats')
      
      // Try to get basic review counts without term filtering
      const basicHodReviews = await prisma.hodReview.findMany({
        where: { submitted: true }
      })
      
      const basicAsstReviews = await prisma.asstReview.findMany({
        where: { submitted: true }
      })
      
      const basicFinalReviews = await prisma.finalReview.findMany({
        where: { submitted: true }
      })
      
      const basicHodPerformanceReviews = await prisma.hodPerformanceReview.findMany({
        where: { submitted: true },
        include: { reviewer: { select: { role: true } } }
      }).then(reviews => reviews.filter(review => review.reviewer.role === 'DEAN'))
      
      const completedReviews = basicFinalReviews.length + basicHodPerformanceReviews.length
      const activeEvaluations = basicHodReviews.length + basicAsstReviews.length - completedReviews
      const totalTeachersAndHods = users.filter(u => u.role === 'TEACHER' || u.role === 'HOD').length
      const pendingReviews = Math.max(0, totalTeachersAndHods - completedReviews - activeEvaluations)
      
      const stats = {
        totalUsers: users.length,
        totalTeachers: users.filter(u => u.role === 'TEACHER').length,
        totalHODs: users.filter(u => u.role === 'HOD').length,
        totalDepartments: users.filter(u => u.role === 'HOD').length,
        activeEvaluations,
        completedReviews,
        pendingReviews,
        currentYear
      }
      return NextResponse.json({ stats })
    }

    // Fetch all submitted reviews for the current year
    const hodReviews = await prisma.hodReview.findMany({
      where: {
        submitted: true,
        termId: { in: currentYearTerms.map(t => t.id) }
      }
    })
    
    console.log('Found HOD reviews:', hodReviews.length)

    const asstDeanReviews = await prisma.asstReview.findMany({
      where: {
        submitted: true,
        termId: { in: currentYearTerms.map(t => t.id) }
      }
    })
    
    console.log('Found Asst Dean reviews:', asstDeanReviews.length)

    // Fetch teacher final reviews (teachers finalized by dean)
    const teacherFinalReviews = await prisma.finalReview.findMany({
      where: {
        submitted: true,
        termId: { in: currentYearTerms.map(t => t.id) }
      }
    })
    
    console.log('Found teacher final reviews:', teacherFinalReviews.length)

    // Fetch HOD performance reviews (HODs finalized by dean)
    const hodPerformanceReviews = await prisma.hodPerformanceReview.findMany({
      where: {
        submitted: true,
        termId: { in: currentYearTerms.map(t => t.id) }
      },
      include: {
        reviewer: { select: { role: true } }
      }
    }).then(reviews => reviews.filter(review => review.reviewer.role === 'DEAN'))
    
    console.log('Found HOD performance reviews:', hodPerformanceReviews.length)

    // Count completed reviews (teachers and HODs who have been finalized by dean)
    const completedReviews = teacherFinalReviews.length + hodPerformanceReviews.length

    // Count active evaluations (teachers and HODs who have submitted but not finalized)
    const activeEvaluations = hodReviews.length + asstDeanReviews.length - completedReviews

    // Count pending reviews (teachers and HODs who haven't submitted yet)
    const totalTeachersAndHods = users.filter(u => u.role === 'TEACHER' || u.role === 'HOD').length
    const pendingReviews = Math.max(0, totalTeachersAndHods - completedReviews - activeEvaluations)
    
    console.log('Review counts:', {
      hodReviews: hodReviews.length,
      asstDeanReviews: asstDeanReviews.length,
      teacherFinalReviews: teacherFinalReviews.length,
      hodPerformanceReviews: hodPerformanceReviews.length,
      completedReviews,
      activeEvaluations,
      pendingReviews
    })

    // Calculate statistics
    const stats = {
      totalUsers: users.length,
      totalTeachers: users.filter(u => u.role === 'TEACHER').length,
      totalHODs: users.filter(u => u.role === 'HOD').length,
      totalDepartments: users.filter(u => u.role === 'HOD').length, // Each HOD represents a department
      activeEvaluations,
      completedReviews,
      pendingReviews,
      currentYear
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin statistics' },
      { status: 500 }
    )
  }
}
