import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session: any = await getServerSession(authOptions as any)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if term exists
    const resolved = await params
    const term = await prisma.term.findUnique({
      where: { id: resolved.id },
      include: {
        departments: true
      }
    })

    if (!term) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 })
    }

    if (term.status !== 'END') {
      return NextResponse.json({ error: 'This is not an END term' }, { status: 400 })
    }

    const currentYear = new Date().getFullYear()
    logger.info(`Ending term ${term.id} for year ${currentYear}`, 'admin')

    // Validate business logic for each department before making changes
    for (const department of term.departments) {
      // Simple validation: check if department already has an active term for this year
      const existingTermState = await prisma.termState.findUnique({
        where: { 
          departmentId_year: {
            departmentId: department.id,
            year: currentYear
          }
        }
      })

      if (existingTermState && existingTermState.activeTerm === 'END') {
        logger.warn(
          `Department ${department.name} already has END term active for year ${currentYear}`,
          'admin',
          session.user.id
        )
        
        return NextResponse.json({ 
          error: `Department ${department.name} already has END term active for year ${currentYear}`,
          code: 'TERM_ALREADY_ACTIVE',
          details: { departmentId: department.id, year: currentYear }
        }, { status: 400 })
      }
    }

    // Activate the END term and update department term states
    logger.info(`Activating END term ${term.id} for ${term.departments.length} departments`, 'admin')
    
    await prisma.$transaction(async (tx) => {
      // Term status remains 'END', we just activate it for departments
      // Update department term states to use this END term
      for (const department of term.departments) {
        logger.info(`Updating term state for department ${department.id} to activeTerm: END for year ${currentYear}`, 'admin')
        
        // Check if termState already exists
        await tx.termState.findUnique({
          where: { 
            departmentId_year: {
              departmentId: department.id,
              year: currentYear
            }
          }
        })
        logger.info(`Existing term state for department ${department.id} found`, 'admin')
        
        await tx.termState.upsert({
          where: { 
            departmentId_year: {
              departmentId: department.id,
              year: currentYear
            }
          },
          update: { 
            activeTerm: 'END',
            // Reset visibility fields when switching to END term
            startTermVisibility: 'DRAFT',
            endTermVisibility: 'DRAFT',
            visibility: 'DRAFT'
          },
          create: {
            departmentId: department.id,
            activeTerm: 'END',
            year: currentYear,
            // Initialize visibility fields as DRAFT
            startTermVisibility: 'DRAFT',
            endTermVisibility: 'DRAFT',
            visibility: 'DRAFT'
          }
        })
        logger.info(`Term state updated for department ${department.id}`, 'admin')
      }
    })
    
    logger.info(`Successfully activated END term ${term.id}`, 'admin')

    return NextResponse.json({ 
      message: 'Term ended successfully',
      success: true,
      termId: resolved.id,
      activeTerm: 'END'
    })
  } catch (_error) {
    logger.error('Error ending term', 'admin')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
