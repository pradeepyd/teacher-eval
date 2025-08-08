MCQ-Based Teacher Evaluation Web Application
Overview
A web-based MCQ (Multiple Choice Questions) application designed for teacher evaluation through a structured hierarchy involving Teachers, Heads of Department (HODs), Assistant Dean and Dean. It includes form-based Q&A evaluations, comment submissions, and a point-based results system, all categorized under departments.
User Roles & Permissions
1. Teacher
- Can log in by department
-Teacher will Self-Input Comments or Self-Assessment twice per academic year:
    •  Start of Year: Set goals and expectations
    •  End of Year: Reflect on progress and achievements
✅ Self-Assesment → ✅ HOD Eval → ✅ Asst. Dean Review → ✅ Dean Finalized
- Can view questions created by HOD

2. HOD
- One HOD per department (e.g., Computer Science, Engineering)
- Can create questions (Single line, Multiple lines, Multiple Choice, Checkbox)
- Can view teacher answers
- Can write comments for each teacher
- Can assign points to each teacher
3. Assistant Dean
- Can view results submitted by HOD and teachers
- Can see HOD comments and teacher performance
- Can write final comments
- Can give final points

4. Dean
- Can view results submitted by HOD,Assistant Dean and teachers
- Can see HOD comments and teacher performance
- Can write final comments
- Can give final points
- Makes the final decision (e.g., 'Promoted')
Modules & Features
1. Authentication
Login screen by department with role-based access (Teacher, HOD, Assistant Dean and Dean).
2. Dashboard
Customized dashboard based on user role:
- Teacher: View questions, submit answers
- HOD: Add questions, evaluate teachers, assign points
- Dean: View evaluations and summaries, give final decision
3. User Management (Admin Panel)
Create/Edit/Delete Users, assign roles, and assign users to departments.
4. Department Management
Manage departments and assign one HOD and multiple teachers to each.
5. Question Management
HOD can add questions per department with various answer types.
6. Teacher Evaluation Form
Teachers submit answers once per year; HOD evaluates and assigns points.
7. Results Page
Displayed to Dean with the following format:
Department: Computer Science
8. Reports / View Results
Role-based access with options for print/export.
Workflow Summary
1. HOD adds questions for their department.
2. Teachers log in and answer these questions.
3. HOD evaluates answers, writes comments, assigns points.
4. Dean reviews evaluations, adds comments and scores, and marks promotion.
5. Final results are stored and viewable.