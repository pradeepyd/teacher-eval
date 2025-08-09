import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'HOD') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolved = 'then' in (context.params as any) ? await (context.params as Promise<{ id: string }>) : (context.params as { id: string })
    const questionId = resolved.id
    const { question, type, options, optionScores, order } = await request.json()

    if (!question || !type) {
      return NextResponse.json({ error: 'Question and type are required' }, { status: 400 })
    }

    if (!['TEXT', 'TEXTAREA', 'MCQ', 'CHECKBOX'].includes(type)) {
      return NextResponse.json({ error: 'Invalid question type' }, { status: 400 })
    }

    // Check if question exists and belongs to HOD's department
    const existingQuestion = await prisma.question.findUnique({
      where: { id: questionId }
    })

    if (!existingQuestion) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    if (existingQuestion.departmentId !== session.user.departmentId) {
      return NextResponse.json({ error: 'Unauthorized to edit this question' }, { status: 403 })
    }

    // Check if there are any teacher answers for this question
    const answerCount = await prisma.teacherAnswer.count({
      where: { questionId: questionId }
    })

    if (answerCount > 0) {
      return NextResponse.json({ 
        error: 'Cannot edit question that has been answered by teachers' 
      }, { status: 400 })
    }

    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data: {
        question: question.trim(),
        type,
        options: (type === 'MCQ' || type === 'CHECKBOX') ? options || [] : [],
        optionScores: (type === 'MCQ' || type === 'CHECKBOX') ? optionScores || [] : [],
        order: order !== undefined ? order : existingQuestion.order
      },
      include: {
        department: true
      }
    })

    return NextResponse.json(updatedQuestion)
  } catch (error) {
    console.error('Error updating question:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'HOD') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolved = 'then' in (context.params as any) ? await (context.params as Promise<{ id: string }>) : (context.params as { id: string })
    const questionId = resolved.id

    // Check if question exists and belongs to HOD's department
    const existingQuestion = await prisma.question.findUnique({
      where: { id: questionId }
    })

    if (!existingQuestion) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    if (existingQuestion.departmentId !== session.user.departmentId) {
      return NextResponse.json({ error: 'Unauthorized to delete this question' }, { status: 403 })
    }

    // Check if there are any teacher answers for this question
    const answerCount = await prisma.teacherAnswer.count({
      where: { questionId: questionId }
    })

    if (answerCount > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete question that has been answered by teachers' 
      }, { status: 400 })
    }

    await prisma.question.delete({
      where: { id: questionId }
    })

    return NextResponse.json({ message: 'Question deleted successfully' })
  } catch (error) {
    console.error('Error deleting question:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}