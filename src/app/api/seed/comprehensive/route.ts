import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'

export async function POST(request: NextRequest) {
  try {
    // Clear existing data (except users)
    await prisma.finalReview.deleteMany()
    await prisma.asstReview.deleteMany()
    await prisma.hodReview.deleteMany()
    await prisma.selfComment.deleteMany()
    await prisma.teacherAnswer.deleteMany()
    await prisma.question.deleteMany()
    await prisma.term.deleteMany()
    await prisma.termState.deleteMany()

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

    // Create evaluation terms
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

    const pastTerm = await prisma.term.create({
      data: {
        name: 'Spring 2024',
        year: 2024,
        status: 'END',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-05-31'),
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
          activeTerm: currentTerm.id,
          currentTerm: 'START'
        },
        {
          departmentId: mathematicsDept.id,
          activeTerm: currentTerm.id,
          currentTerm: 'START'
        }
      ]
    })

    // Create evaluation questions
    const questions = await prisma.question.createMany({
      data: [
        {
          text: 'How would you rate your teaching effectiveness this semester?',
          type: 'TEXT',
          term: 'START',
          required: true
        },
        {
          text: 'What innovative teaching methods did you implement?',
          type: 'TEXTAREA',
          term: 'START',
          required: true
        },
        {
          text: 'How often do you use technology in your teaching?',
          type: 'MCQ',
          options: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'],
          term: 'START',
          required: true
        },
        {
          text: 'Which teaching tools do you use? (Select all that apply)',
          type: 'CHECKBOX',
          options: ['PowerPoint', 'Online platforms', 'Hands-on activities', 'Group projects', 'Video content'],
          term: 'START',
          required: true
        },
        {
          text: 'What are your goals for the next semester?',
          type: 'TEXTAREA',
          term: 'END',
          required: true
        },
        {
          text: 'How satisfied are you with student engagement?',
          type: 'MCQ',
          options: ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'],
          term: 'END',
          required: true
        }
      ]
    })

    // Get users for creating evaluations
    const users = await prisma.user.findMany()
    const teacher1 = users.find(u => u.email === 'teacher1@example.com')!
    const teacher2 = users.find(u => u.email === 'teacher2@example.com')!
    const teacher3 = users.find(u => u.email === 'teacher3@example.com')!
    const hod = users.find(u => u.email === 'hod@example.com')!
    const hodMath = users.find(u => u.email === 'hod.math@example.com')!

    // Get questions
    const allQuestions = await prisma.question.findMany()
    const startQuestions = allQuestions.filter(q => q.term === 'START')
    const endQuestions = allQuestions.filter(q => q.term === 'END')

    // Create teacher answers for current term
    for (const teacher of [teacher1, teacher2]) {
      // START term answers
      for (const question of startQuestions) {
        await prisma.teacherAnswer.create({
          data: {
            teacherId: teacher.id,
            questionId: question.id,
            answer: question.type === 'MCQ' ? 'Often' : 
                   question.type === 'CHECKBOX' ? 'PowerPoint,Online platforms' :
                   question.type === 'TEXTAREA' ? 'I implemented project-based learning and interactive discussions to engage students more effectively.' :
                   'I believe my teaching effectiveness is good, with room for improvement in certain areas.',
            term: 'START'
          }
        })
      }

      // END term answers
      for (const question of endQuestions) {
        await prisma.teacherAnswer.create({
          data: {
            teacherId: teacher.id,
            questionId: question.id,
            answer: question.type === 'MCQ' ? 'Satisfied' :
                   question.type === 'TEXTAREA' ? 'My goals for next semester include incorporating more technology and improving student feedback mechanisms.' :
                   'Overall satisfied with student engagement, though there is always room for improvement.',
            term: 'END'
          }
        })
      }

      // Create self comments
      await prisma.selfComment.create({
        data: {
          teacherId: teacher.id,
          comment: 'I have worked hard to improve my teaching methods and student engagement this semester.',
          term: 'START'
        }
      })

      await prisma.selfComment.create({
        data: {
          teacherId: teacher.id,
          comment: 'I am satisfied with my performance and look forward to implementing new strategies next semester.',
          term: 'END'
        }
      })
    }

    // Create HOD reviews
    await prisma.hodReview.create({
      data: {
        teacherId: teacher1.id,
        hodId: hod.id,
        comment: 'Teacher Brown shows excellent teaching skills and good student engagement.',
        score: 8,
        term: 'START',
        submitted: true
      }
    })

    await prisma.hodReview.create({
      data: {
        teacherId: teacher2.id,
        hodId: hod.id,
        comment: 'Teacher Davis demonstrates strong commitment to teaching and uses innovative methods.',
        score: 9,
        term: 'START',
        submitted: true
      }
    })

    // Create Assistant Dean reviews
    await prisma.asstReview.create({
      data: {
        teacherId: teacher1.id,
        asstDeanId: users.find(u => u.email === 'asstdean@example.com')!.id,
        comment: 'Good performance overall, with room for improvement in technology integration.',
        score: 7,
        term: 'START',
        submitted: true
      }
    })

    await prisma.asstReview.create({
      data: {
        teacherId: teacher2.id,
        asstDeanId: users.find(u => u.email === 'asstdean@example.com')!.id,
        comment: 'Excellent teaching performance with innovative approaches.',
        score: 8,
        term: 'START',
        submitted: true
      }
    })

    // Create Dean final reviews
    await prisma.finalReview.create({
      data: {
        teacherId: teacher1.id,
        deanId: users.find(u => u.email === 'dean@example.com')!.id,
        finalComment: 'Good performance with potential for growth.',
        finalScore: 7,
        promoted: false,
        status: 'ON_HOLD',
        term: 'START',
        submitted: true
      }
    })

    await prisma.finalReview.create({
      data: {
        teacherId: teacher2.id,
        deanId: users.find(u => u.email === 'dean@example.com')!.id,
        finalComment: 'Outstanding performance deserving of promotion.',
        finalScore: 9,
        promoted: true,
        status: 'PROMOTED',
        term: 'START',
        submitted: true
      }
    })

    return NextResponse.json({ 
      message: 'Comprehensive test data created successfully',
      summary: {
        departments: departments.length,
        users: users.length,
        terms: 2,
        questions: allQuestions.length,
        evaluations: 'Multiple evaluations created for testing',
        reviews: 'HOD, Assistant Dean, and Dean reviews created'
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
    console.error('Error creating comprehensive test data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
