import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'

export async function POST(request: NextRequest) {
  try {
    // Check if departments already exist
    const existingDepartments = await prisma.department.findMany()
    
    if (existingDepartments.length === 0) {
      // Create sample departments
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

    // Get the first department for testing
    const computerScienceDept = await prisma.department.findFirst({
      where: { name: 'Computer Science' }
    })

    if (!computerScienceDept) {
      return NextResponse.json({ error: 'Department not found' }, { status: 500 })
    }

    // Check if users already exist
    const existingUsers = await prisma.user.findMany()
    
    if (existingUsers.length > 0) {
      return NextResponse.json({ 
        message: 'Database already has users',
        users: existingUsers.map(u => ({ id: u.id, email: u.email, role: u.role }))
      })
    }

    // Hash password for all users
    const hashedPassword = await bcrypt.hash('password123', 10)

    // Create sample users
    const users = await prisma.user.createMany({
      data: [
        // Admin user
        {
          name: 'Admin User',
          email: 'admin@example.com',
          password: hashedPassword,
          role: 'ADMIN',
          departmentId: null
        },
        // Dean user (institution-wide, no department)
        {
          name: 'Dean Smith',
          email: 'dean@example.com',
          password: hashedPassword,
          role: 'DEAN',
          departmentId: null
        },
        // Assistant Dean user (institution-wide, no department)
        {
          name: 'Assistant Dean Johnson',
          email: 'asstdean@example.com',
          password: hashedPassword,
          role: 'ASST_DEAN',
          departmentId: null
        },
        // HOD user (department-specific)
        {
          name: 'HOD Williams',
          email: 'hod@example.com',
          password: hashedPassword,
          role: 'HOD',
          departmentId: computerScienceDept.id
        },
        // Teacher users (department-specific)
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
          departmentId: computerScienceDept.id
        }
      ]
    })

    return NextResponse.json({ 
      message: 'Sample users created successfully',
      count: users.count,
      testCredentials: {
        admin: { email: 'admin@example.com', password: 'password123', department: 'None' },
        dean: { email: 'dean@example.com', password: 'password123', department: 'None' },
        asstDean: { email: 'asstdean@example.com', password: 'password123', department: 'None' },
        hod: { email: 'hod@example.com', password: 'password123', department: 'Computer Science' },
        teacher1: { email: 'teacher1@example.com', password: 'password123', department: 'Computer Science' },
        teacher2: { email: 'teacher2@example.com', password: 'password123', department: 'Computer Science' },
        teacher3: { email: 'teacher3@example.com', password: 'password123', department: 'Computer Science' }
      }
    })
  } catch (error) {
    console.error('Error seeding database:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
