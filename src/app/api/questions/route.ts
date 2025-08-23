import { NextRequest } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createSuccessResponse, createApiErrorResponse, createUnauthorizedResponse } from '@/lib/api-response'
import { validateRequestBody, validationSchemas } from '@/lib/api-validation'


export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return createUnauthorizedResponse()
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

    return createSuccessResponse({ questions })
  } catch (error) {
    console.error('Error fetching questions:', error)
    return createApiErrorResponse(error, {
      operation: 'fetch questions',
      component: 'QuestionsAPI'
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'HOD') {
      return createUnauthorizedResponse()
    }

    // Ensure HOD has a department assigned
    if (!session.user.departmentId) {
      return createApiErrorResponse(
        new Error('You must be assigned to a department to create questions. Please contact admin.'),
        { operation: 'create question', component: 'QuestionsAPI' },
        400
      )
    }

    const body = await request.json()
    
    // Validate input using the centralized validation
    const validation = validateRequestBody(body, validationSchemas.question, 'question creation')
    if (!validation.success) {
      return validation.response
    }
    
    const { question, type, term, options, optionScores, order } = validation.data

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
      return createApiErrorResponse(
        new Error('Department term state not configured. Please contact admin to set up terms for your department.'),
        { operation: 'create question', component: 'QuestionsAPI' },
        400
      )
    }

    if (termState.activeTerm !== term) {
      return createApiErrorResponse(
        new Error(`Cannot create questions for ${term} term. Current active term is ${termState.activeTerm}. Questions can only be created for the active term.`),
        { operation: 'create question', component: 'QuestionsAPI' },
        400
      )
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



    return createSuccessResponse(newQuestion, 201)
  } catch (error) {
    console.error('Error creating question:', error)
    return createApiErrorResponse(error, {
      operation: 'create question',
      component: 'QuestionsAPI'
    })
  }
}
