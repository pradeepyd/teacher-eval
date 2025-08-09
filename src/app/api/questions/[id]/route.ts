import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error next-auth v5 types
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  context: any
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'HOD') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolved = await context.params
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

    // If answered, restrict hard edits; allow reordering only
    const answerCount = await prisma.teacherAnswer.count({ where: { questionId } })

    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data: {
        question: answerCount > 0 ? existingQuestion.question : question.trim(),
        type: answerCount > 0 ? existingQuestion.type : type,
        options: answerCount > 0 ? existingQuestion.options : ((type === 'MCQ' || type === 'CHECKBOX') ? options || [] : []),
        optionScores: answerCount > 0 ? existingQuestion.optionScores : ((type === 'MCQ' || type === 'CHECKBOX') ? optionScores || [] : []),
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
  _request: NextRequest,
  context: any
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'HOD') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolved = await context.params
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

    // If answered, soft-disable instead of hard delete
    const answerCount = await prisma.teacherAnswer.count({ where: { questionId } })
    if (answerCount > 0) {
      await prisma.question.update({ where: { id: questionId }, data: { isActive: false } })
      return NextResponse.json({ message: 'Question disabled (soft-deleted) because it has answers' })
    }

    await prisma.question.delete({ where: { id: questionId } })
    return NextResponse.json({ message: 'Question deleted successfully' })
  } catch (error) {
    console.error('Error deleting question:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}