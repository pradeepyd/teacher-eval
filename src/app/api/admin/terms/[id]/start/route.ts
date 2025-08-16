import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    console.log(`Current year: ${currentYear}, Term year: ${term.year}`)

    // Activate the START term and update department term states
    console.log(`Activating START term ${term.id} for ${term.departments.length} departments`)
    console.log(`Departments:`, term.departments.map(d => ({ id: d.id, name: d.name })))
    
    await prisma.$transaction(async (tx) => {
      // Term status remains 'START', we just activate it for departments
      // Update department term states to use this START term
      for (const department of term.departments) {
        console.log(`Updating term state for department ${department.id} to activeTerm: START for year ${currentYear}`)
        
        // Check if termState already exists
        const existing = await tx.termState.findUnique({
          where: { 
            departmentId_year: {
              departmentId: department.id,
              year: currentYear
            }
          }
        })
        console.log(`Existing term state for department ${department.id}:`, existing)
        
        const result = await tx.termState.upsert({
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
        console.log(`Term state updated for department ${department.id}:`, result)
      }
    })
    
    console.log(`Successfully activated START term ${term.id}`)

    return NextResponse.json({ 
      message: 'Term started successfully',
      success: true,
      termId: resolved.id,
      activeTerm: 'START'
    })
  } catch (error) {
    console.error('Error starting term:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
