import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_request: NextRequest) {
  try {
    const departments = await prisma.department.findMany({
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(departments)
  } catch (error) {
    console.error('Error fetching departments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
