# Teacher Evaluation System - Production Setup

## 🚀 Production Deployment Guide

### 1. Environment Variables

Create a `.env.local` file with the following variables:

```env
# Database
DATABASE_URL="your_postgresql_connection_string"

# NextAuth
NEXTAUTH_SECRET="your_nextauth_secret_key"
NEXTAUTH_URL="https://your-domain.com"

# Admin Secret (Optional - for admin registration)
ADMIN_SECRET_CODE="your_admin_secret_code"
```

### 2. Database Setup

1. **Set up PostgreSQL database**
2. **Run migrations:**
   ```bash
   npx prisma migrate deploy
   ```

### 3. Initial Setup (No Seed Data)

#### Create First Admin User

Use the registration API to create your first admin user:

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@yourdomain.com",
    "password": "secure_password",
    "role": "ADMIN",
    "secretCode": "your_admin_secret_code"
  }'
```

#### Create Departments

Use the admin interface or API to create departments:

```bash
curl -X POST http://localhost:3001/api/departments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_session_token" \
  -d '{"name": "Computer Science"}'
```

#### Create Users

Register users through the admin interface or API:

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Teacher Name",
    "email": "teacher@yourdomain.com",
    "password": "secure_password",
    "role": "TEACHER",
    "departmentId": "department_id_here"
  }'
```

### 4. Production Build

```bash
npm run build
npm start
```

### 5. Security Considerations

- ✅ **Password Hashing**: All passwords are hashed with bcrypt
- ✅ **Session Management**: NextAuth.js handles secure sessions
- ✅ **Role-Based Access**: Each API endpoint validates user roles
- ✅ **Input Validation**: Zod schemas validate all inputs
- ✅ **SQL Injection Protection**: Prisma ORM prevents SQL injection

### 6. User Roles & Permissions

| Role | Permissions |
|------|-------------|
| **ADMIN** | User management, department management, term management |
| **DEAN** | Final reviews, promotion decisions |
| **ASST_DEAN** | Review evaluations after HOD |
| **HOD** | Review teachers, manage questions |
| **TEACHER** | Complete self-evaluations |

### 7. API Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login (via NextAuth)

#### Departments
- `GET /api/departments/public` - Public department list
- `GET /api/departments` - Admin: Department management
- `POST /api/departments` - Admin: Create department

#### Users
- `GET /api/users` - Admin: List users
- `POST /api/admin/users` - Admin: Create user
- `PUT /api/admin/users/[id]` - Admin: Update user
- `DELETE /api/admin/users/[id]` - Admin: Delete user

#### Evaluations
- `GET /api/questions` - Get evaluation questions
- `POST /api/teacher-answers` - Submit teacher answers
- `POST /api/reviews/hod` - Submit HOD review
- `POST /api/reviews/asst-dean` - Submit Assistant Dean review
- `POST /api/reviews/dean` - Submit Dean final review

### 8. Testing the System

1. **Login as Admin**: Create departments and users
2. **Login as Teacher**: Complete self-evaluation
3. **Login as HOD**: Review teacher evaluations
4. **Login as Assistant Dean**: Review after HOD
5. **Login as Dean**: Make final decisions

### 9. Monitoring & Maintenance

- **Database Backups**: Regular PostgreSQL backups
- **Log Monitoring**: Monitor application logs
- **Performance**: Monitor API response times
- **Security**: Regular security updates

### 10. Troubleshooting

#### Common Issues:
- **Database Connection**: Check DATABASE_URL
- **Authentication**: Verify NEXTAUTH_SECRET
- **CORS**: Configure for your domain
- **Permissions**: Ensure proper file permissions

#### Support:
- Check application logs for errors
- Verify environment variables
- Test database connectivity
- Validate API endpoints

---

**Note**: This system is designed for production use without seed data. All users and departments should be created through the proper registration and management interfaces.
