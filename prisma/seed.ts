import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create departments
  const departments = [
    { name: 'Computer Science' },
    { name: 'Mathematics' },
    { name: 'Physics' },
    { name: 'Chemistry' },
    { name: 'Biology' },
  ]

  console.log('📚 Creating departments...')
  const createdDepartments = []
  for (const dept of departments) {
    const department = await prisma.department.upsert({
      where: { name: dept.name },
      update: {},
      create: dept,
    })
    createdDepartments.push(department)
    console.log(`  ✅ ${department.name}`)
  }

  // Create term states for each department
  console.log('📅 Setting up term states...')
  for (const dept of createdDepartments) {
    await prisma.termState.upsert({
      where: { departmentId: dept.id },
      update: {},
      create: {
        departmentId: dept.id,
        activeTerm: 'START',
      },
    })
    console.log(`  ✅ Term state for ${dept.name}`)
  }

  // Create users with different roles
  const users = [
    {
      name: 'Super Admin',
      email: 'admin@examme.com',
      password: 'admin123',
      role: 'ADMIN',
      departmentId: createdDepartments[0].id,
    },
    {
      name: 'CS Dean',
      email: 'dean@cs.examme.com',
      password: 'dean123',
      role: 'DEAN',
      departmentId: createdDepartments[0].id,
    },
    {
      name: 'CS Assistant Dean',
      email: 'asst@cs.examme.com',
      password: 'asst123',
      role: 'ASST_DEAN',
      departmentId: createdDepartments[0].id,
    },
    {
      name: 'CS HOD',
      email: 'hod@cs.examme.com',
      password: 'hod123',
      role: 'HOD',
      departmentId: createdDepartments[0].id,
    },
    {
      name: 'John Teacher',
      email: 'teacher@cs.examme.com',
      password: 'teacher123',
      role: 'TEACHER',
      departmentId: createdDepartments[0].id,
    },
    {
      name: 'Jane Teacher',
      email: 'teacher2@cs.examme.com',
      password: 'teacher123',
      role: 'TEACHER',
      departmentId: createdDepartments[0].id,
    },
  ]

  console.log('👥 Creating users...')
  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10)
    
    const createdUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        name: user.name,
        email: user.email,
        password: hashedPassword,
        role: user.role as any,
        departmentId: user.departmentId,
      },
    })
    console.log(`  ✅ ${createdUser.name} (${createdUser.role}) - ${createdUser.email}`)
  }

  console.log('\n🎉 Database seeded successfully!')
  console.log('\n📝 Login Credentials:')
  console.log('┌─────────────────────────────────────────────────────┐')
  console.log('│                    TEST LOGINS                      │')
  console.log('├─────────────────────────────────────────────────────┤')
  console.log('│ Super Admin:                                        │')
  console.log('│   Email: admin@examme.com                           │')
  console.log('│   Password: admin123                                │')
  console.log('│                                                     │')
  console.log('│ Dean:                                               │')
  console.log('│   Email: dean@cs.examme.com                         │')
  console.log('│   Password: dean123                                 │')
  console.log('│                                                     │')
  console.log('│ Assistant Dean:                                     │')
  console.log('│   Email: asst@cs.examme.com                         │')
  console.log('│   Password: asst123                                 │')
  console.log('│                                                     │')
  console.log('│ HOD:                                                │')
  console.log('│   Email: hod@cs.examme.com                          │')
  console.log('│   Password: hod123                                  │')
  console.log('│                                                     │')
  console.log('│ Teacher:                                            │')
  console.log('│   Email: teacher@cs.examme.com                      │')
  console.log('│   Password: teacher123                              │')
  console.log('└─────────────────────────────────────────────────────┘')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error seeding database:', e)
    await prisma.$disconnect()
    process.exit(1)
  })