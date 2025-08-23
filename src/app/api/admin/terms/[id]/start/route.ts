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

    if (term.status !== 'START') {
      return NextResponse.json({ error: 'This is not a START term' }, { status: 400 })
    }

    const currentYear = new Date().getFullYear()
    logger.info(`Starting term ${term.id} for year ${currentYear}`, 'admin')

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

      if (existingTermState && existingTermState.activeTerm === 'START') {
        logger.warn(
          `Department ${department.name} already has START term active for year ${currentYear}`,
          'admin',
          session.user.id
        )
        
        return NextResponse.json({ 
          error: `Department ${department.name} already has START term active for year ${currentYear}`,
          code: 'TERM_ALREADY_ACTIVE',
          details: { departmentId: department.id, year: currentYear }
        }, { status: 400 })
      }
    }

    // Activate the START term and update department term states
    logger.info(`Activating START term ${term.id} for ${term.departments.length} departments`, 'admin')
    
    await prisma.$transaction(async (tx) => {
      // Term status remains 'START', we just activate it for departments
      // Update department term states to use this START term
      for (const department of term.departments) {
        logger.info(`Updating term state for department ${department.id} to activeTerm: START for year ${currentYear}`, 'admin')
        
        // Check if termState already exists
        const _existing = await tx.termState.findUnique({
          where: { 
            departmentId_year: {
              departmentId: department.id,
              year: currentYear
            }
          }
        })
        logger.info(`Existing term state for department ${department.id} found`, 'admin')
        
        const _result = await tx.termState.upsert({
          where: { 
            departmentId_year: {
              departmentId: department.id,
              year: currentYear
            }
          },
          update: { 
            activeTerm: 'START',
            // Reset visibility fields when switching to START term
            startTermVisibility: 'DRAFT',
            endTermVisibility: 'DRAFT',
            visibility: 'DRAFT'
          },
          create: {
            departmentId: department.id,
            activeTerm: 'START',
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
    
    logger.info(`Successfully activated START term ${term.id}`, 'admin')

    return NextResponse.json({ 
      message: 'Term started successfully',
      success: true,
      termId: resolved.id,
      activeTerm: 'START'
    })
  } catch (_error) {
    logger.error('Error starting term', 'admin')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
