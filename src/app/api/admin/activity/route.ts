import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 app router types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type ActivityItem = {
  id: string
  type: 'SELF_SUBMITTED' | 'HOD_REVIEW' | 'TERM_UPDATE' | 'USER_CREATED' | 'DEPARTMENT_CREATED'
  message: string
  department?: string | null
  timestamp: string
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const TAKE = 12

    const [selfComments, hodReviews, terms, users, departments] = await Promise.all([
      prisma.selfComment.findMany({
        orderBy: { createdAt: 'desc' },
        take: TAKE,
        include: { teacher: { include: { department: true } } }
      }),
      prisma.hodReview.findMany({
        where: { submitted: true },
        orderBy: { updatedAt: 'desc' },
        take: TAKE,
        include: { teacher: { include: { department: true } }, reviewer: true }
      }),
      prisma.term.findMany({ orderBy: { updatedAt: 'desc' }, take: TAKE }),
      prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: TAKE }),
      prisma.department.findMany({ orderBy: { createdAt: 'desc' }, take: TAKE }),
    ])

    const activities: ActivityItem[] = []

    for (const c of selfComments) {
      activities.push({
        id: `self-${c.id}`,
        type: 'SELF_SUBMITTED',
        message: `${c.teacher.name} submitted ${c.term} self-evaluation`,
        department: c.teacher.department?.name ?? null,
        timestamp: c.createdAt.toISOString(),
      })
    }

    for (const r of hodReviews) {
      activities.push({
        id: `hod-${r.id}`,
        type: 'HOD_REVIEW',
        message: `HOD review completed for ${r.teacher.name}`,
        department: r.teacher.department?.name ?? null,
        timestamp: r.updatedAt.toISOString(),
      })
    }

    for (const t of terms) {
      activities.push({
        id: `term-${t.id}-${t.updatedAt.getTime()}`,
        type: 'TERM_UPDATE',
        message: `Term "${t.name}" status updated to ${t.status}`,
        department: null,
        timestamp: t.updatedAt.toISOString(),
      })
    }

    for (const u of users) {
      activities.push({
        id: `user-${u.id}`,
        type: 'USER_CREATED',
        message: `New user created: ${u.name} (${u.role})`,
        department: null,
        timestamp: u.createdAt.toISOString(),
      })
    }

    for (const d of departments) {
      activities.push({
        id: `dept-${d.id}`,
        type: 'DEPARTMENT_CREATED',
        message: `Department created: ${d.name}`,
        department: d.name,
        timestamp: d.createdAt.toISOString(),
      })
    }

    const sorted = activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    const recent = sorted.slice(0, 8)

    return NextResponse.json({ activities: recent })
  } catch (error) {
    console.error('Error fetching activity feed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


