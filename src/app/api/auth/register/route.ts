import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role, departmentId, secretCode } = await request.json()

    // Validate required fields
    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Name, email, password, and role are required' }, { status: 400 })
    }

    // Validate role
    const validRoles = ['TEACHER', 'HOD', 'ASST_DEAN', 'DEAN', 'ADMIN']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // For admin, validate secret code
    if (role === 'ADMIN') {
      const adminSecretCode = process.env.ADMIN_SECRET_CODE || 'admin123'
      if (secretCode !== adminSecretCode) {
        return NextResponse.json({ error: 'Invalid admin secret code' }, { status: 400 })
      }
    }

    // For department-specific roles, validate department
    if ((role === 'TEACHER' || role === 'HOD') && !departmentId) {
      return NextResponse.json({ error: 'Department is required for this role' }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
    }

    // For department-specific roles, validate department exists
    if (departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: departmentId }
      })

      if (!department) {
        return NextResponse.json({ error: 'Department not found' }, { status: 400 })
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        departmentId: role === 'ADMIN' || role === 'DEAN' || role === 'ASST_DEAN' ? null : departmentId
      },
      include: {
        department: true
      }
    })

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({
      message: 'User registered successfully',
      user: userWithoutPassword
    }, { status: 201 })

  } catch (error) {
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
