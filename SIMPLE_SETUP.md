# Simple Setup Guide

## For Non-Technical Users

### 1. Initial Setup (One-time only)

1. **Create a `.env` file** in the project folder with:
```env
DATABASE_URL="your-supabase-database-url"
NEXTAUTH_SECRET="any-random-string-here"
NEXTAUTH_URL="http://localhost:3000"
```

2. **Run the database setup:**
```bash
npm run db:reset
```

3. **Start the application:**
```bash
npm run dev
```

### 2. Creating the First Admin

1. Go to `http://localhost:3000/admin`
2. Click "Manage Users"
3. Click "Add New User"
4. Fill in the details:
   - Name: Your name
   - Email: Your email
   - Password: Choose a password (at least 6 characters)
   - Role: Select "ADMIN"
   - Department: Leave empty for admin
5. Click "Create User"

### 3. Adding Other Users

1. Login as admin
2. Go to "Manage Users"
3. Click "Add New User"
4. Fill in details:
   - Name: User's name
   - Email: User's email
   - Password: Choose a password
   - Role: Select appropriate role (TEACHER, HOD, etc.)
   - Department: Select the department

### 4. Setting Up Departments

1. Login as admin
2. Go to "Manage Departments"
3. Click "Add Department"
4. Enter department name
5. Click "Create Department"

### 5. Setting Active Terms

1. Login as admin
2. Go to "Manage Departments"
3. Find the department
4. Click "Set Active Term"
5. Choose "START" or "END"

### 6. Creating Questions (HOD only)

1. Login as HOD
2. Go to "Question Management"
3. Click "Add Question"
4. Fill in:
   - Question text
   - Question type
   - Term (START or END)
   - Options (for MCQ/Checkbox)
5. Click "Create Question"

## User Roles Explained

- **ADMIN**: Can manage users and departments
- **HOD**: Can create questions and review teachers
- **TEACHER**: Can submit self-evaluations
- **ASST_DEAN**: Can review HOD evaluations
- **DEAN**: Can make final decisions

## Simple Workflow

1. Admin creates departments and users
2. HOD creates questions for their department
3. Teachers submit evaluations
4. HOD reviews teacher submissions
5. Assistant Dean reviews HOD reviews
6. Dean makes final decisions

## Troubleshooting

- **Can't login?** Check if the user exists and password is correct
- **Can't access admin?** Make sure you're logged in as ADMIN role
- **No questions showing?** Make sure HOD has created questions
- **Can't submit evaluation?** Check if the term is active for your department
