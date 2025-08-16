import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const departmentId = searchParams.get('departmentId')
    const term = searchParams.get('term')

    // For HODs, only show questions from their department
    const whereClause: Record<string, unknown> = {}
    
    if (session.user.role === 'HOD') {
      whereClause.departmentId = session.user.departmentId
    } else if (departmentId) {
      whereClause.departmentId = departmentId
    }

    if (term) {
      whereClause.term = term
    }

    // Only fetch active questions (not soft-deleted)
    whereClause.isActive = true

    const questions = await prisma.question.findMany({
      where: whereClause,
      include: {
        department: true
      },
      orderBy: [
        { term: 'asc' },
        { order: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    return NextResponse.json({ questions })
  } catch (error) {
    console.error('Error fetching questions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'HOD') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { question, type, term, options, optionScores, order } = await request.json()

    if (!question || !type || !term) {
      return NextResponse.json({ error: 'Question, type, and term are required' }, { status: 400 })
    }

    if (!['TEXT', 'TEXTAREA', 'MCQ', 'CHECKBOX'].includes(type)) {
      return NextResponse.json({ error: 'Invalid question type' }, { status: 400 })
    }

    if (!['START', 'END'].includes(term)) {
      return NextResponse.json({ error: 'Invalid term' }, { status: 400 })
    }

    // Check if the current term matches the department's active term for current year
    const currentYear = new Date().getFullYear()
    const termState = await prisma.termState.findUnique({
      where: { 
        departmentId_year: {
          departmentId: session.user.departmentId,
          year: currentYear
        }
      }
    })

    if (!termState) {
      return NextResponse.json({ 
        error: 'Department term state not configured. Please contact admin to set up terms for your department.' 
      }, { status: 400 })
    }

    if (termState.activeTerm !== term) {
      return NextResponse.json({ 
        error: `Cannot create questions for ${term} term. Current active term is ${termState.activeTerm}. Questions can only be created for the active term.` 
      }, { status: 400 })
    }

    const newQuestion = await prisma.question.create({
      data: {
        departmentId: session.user.departmentId,
        year: new Date().getFullYear(), // Current academic year
        question: question.trim(),
        type,
        term,
        options: (type === 'MCQ' || type === 'CHECKBOX') ? options || [] : [],
        optionScores: (type === 'MCQ' || type === 'CHECKBOX') ? optionScores || [] : [],
        isActive: true,
        isPublished: false,
        order: order || 0
      },
      include: {
        department: true
      }
    })



    return NextResponse.json(newQuestion, { status: 201 })
  } catch (error) {
    console.error('Error creating question:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
