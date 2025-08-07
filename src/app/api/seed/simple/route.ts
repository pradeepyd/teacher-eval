import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'

export async function POST(request: NextRequest) {
  try {
    // Create departments if they don't exist
    const existingDepartments = await prisma.department.findMany()
    
    if (existingDepartments.length === 0) {
      await prisma.department.createMany({
        data: [
          { name: 'Computer Science' },
          { name: 'Mathematics' },
          { name: 'Physics' },
          { name: 'Chemistry' },
          { name: 'Biology' },
          { name: 'English' },
          { name: 'History' },
          { name: 'Economics' }
        ]
      })
    }

    // Get departments
    const departments = await prisma.department.findMany()
    const computerScienceDept = departments.find(d => d.name === 'Computer Science')!
    const mathematicsDept = departments.find(d => d.name === 'Mathematics')!

    // Create users if they don't exist
    const existingUsers = await prisma.user.findMany()
    
    if (existingUsers.length === 0) {
      const hashedPassword = await bcrypt.hash('password123', 10)
      
      await prisma.user.createMany({
        data: [
          // Admin user
          {
            name: 'Admin User',
            email: 'admin@example.com',
            password: hashedPassword,
            role: 'ADMIN',
            departmentId: null
          },
          // Dean user (institution-wide)
          {
            name: 'Dean Smith',
            email: 'dean@example.com',
            password: hashedPassword,
            role: 'DEAN',
            departmentId: null
          },
          // Assistant Dean user (institution-wide)
          {
            name: 'Assistant Dean Johnson',
            email: 'asstdean@example.com',
            password: hashedPassword,
            role: 'ASST_DEAN',
            departmentId: null
          },
          // HOD users (department-specific)
          {
            name: 'HOD Williams',
            email: 'hod@example.com',
            password: hashedPassword,
            role: 'HOD',
            departmentId: computerScienceDept.id
          },
          {
            name: 'HOD Mathematics',
            email: 'hod.math@example.com',
            password: hashedPassword,
            role: 'HOD',
            departmentId: mathematicsDept.id
          },
          // Teacher users
          {
            name: 'Teacher Brown',
            email: 'teacher1@example.com',
            password: hashedPassword,
            role: 'TEACHER',
            departmentId: computerScienceDept.id
          },
          {
            name: 'Teacher Davis',
            email: 'teacher2@example.com',
            password: hashedPassword,
            role: 'TEACHER',
            departmentId: computerScienceDept.id
          },
          {
            name: 'Teacher Miller',
            email: 'teacher3@example.com',
            password: hashedPassword,
            role: 'TEACHER',
            departmentId: mathematicsDept.id
          }
        ]
      })
    }

    // Create a simple term
    const currentTerm = await prisma.term.create({
      data: {
        name: 'Fall 2024',
        year: 2024,
        status: 'START',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-31'),
        departments: {
          connect: [
            { id: computerScienceDept.id },
            { id: mathematicsDept.id }
          ]
        }
      }
    })

    // Create term states
    await prisma.termState.createMany({
      data: [
        {
          departmentId: computerScienceDept.id,
          activeTerm: 'START'
        },
        {
          departmentId: mathematicsDept.id,
          activeTerm: 'START'
        }
      ]
    })

    // Create some basic questions
    await prisma.question.createMany({
      data: [
        {
          departmentId: computerScienceDept.id,
          question: 'How would you rate your teaching effectiveness this semester?',
          type: 'TEXT',
          term: 'START',
          order: 1
        },
        {
          departmentId: computerScienceDept.id,
          question: 'What innovative teaching methods did you implement?',
          type: 'TEXTAREA',
          term: 'START',
          order: 2
        },
        {
          departmentId: computerScienceDept.id,
          question: 'How often do you use technology in your teaching?',
          type: 'MCQ',
          options: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'],
          term: 'START',
          order: 3
        },
        {
          departmentId: mathematicsDept.id,
          question: 'How would you rate your teaching effectiveness this semester?',
          type: 'TEXT',
          term: 'START',
          order: 1
        },
        {
          departmentId: mathematicsDept.id,
          question: 'What innovative teaching methods did you implement?',
          type: 'TEXTAREA',
          term: 'START',
          order: 2
        },
        {
          departmentId: mathematicsDept.id,
          question: 'How often do you use technology in your teaching?',
          type: 'MCQ',
          options: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'],
          term: 'START',
          order: 3
        }
      ]
    })

    return NextResponse.json({ 
      message: 'Simple test data created successfully',
      summary: {
        departments: departments.length,
        terms: 1,
        questions: 6
      },
      testCredentials: {
        admin: { email: 'admin@example.com', password: 'password123', department: 'None' },
        dean: { email: 'dean@example.com', password: 'password123', department: 'None' },
        asstDean: { email: 'asstdean@example.com', password: 'password123', department: 'None' },
        hod: { email: 'hod@example.com', password: 'password123', department: 'Computer Science' },
        hodMath: { email: 'hod.math@example.com', password: 'password123', department: 'Mathematics' },
        teacher1: { email: 'teacher1@example.com', password: 'password123', department: 'Computer Science' },
        teacher2: { email: 'teacher2@example.com', password: 'password123', department: 'Computer Science' },
        teacher3: { email: 'teacher3@example.com', password: 'password123', department: 'Mathematics' }
      }
    })
  } catch (error) {
    console.error('Error creating simple test data:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
