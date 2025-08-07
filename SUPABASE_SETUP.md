# 🚀 Supabase Database Setup Guide

## Overview
This guide shows you how to connect your MCQ Teacher Evaluation System to Supabase PostgreSQL database.

## ✅ What You Need

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Supabase Project**: Create a new project in your dashboard

## 🔧 Step-by-Step Setup

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `examme-database` (or any name you prefer)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your location
5. Click "Create new project"

### Step 2: Get Connection String
1. In your Supabase dashboard, click **"Connect"** button (top bar)
2. Choose **"Prisma"** from the connection options
3. Copy the **Session Pooler** connection string (recommended for most apps)

The connection string format will be:
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

### Step 3: Update Your .env File
Replace the placeholders in your `.env` file:

```bash
# Replace [YOUR-PROJECT-REF], [YOUR-PASSWORD], and [YOUR-REGION] with actual values
DATABASE_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[YOUR-REGION].pooler.supabase.com:5432/postgres"

NEXTAUTH_SECRET="your-super-secret-nextauth-key-here-change-this-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

**Example** (with fake values):
```bash
DATABASE_URL="postgresql://postgres.abcdefghijklmnop:mySecurePassword123@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

### Step 4: Create Database Tables
Run the Prisma migration to create all tables:

```bash
# Generate Prisma client
npx prisma generate

# Create and run migration
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view your database
npx prisma studio
```

### Step 5: Verify Connection
Test your connection:

```bash
# Start your development server
npm run dev
```

Your app should now connect to Supabase! 🎉

## 🔄 Different Connection String Types

Supabase provides 3 types of connection strings:

### 1. Session Pooler (Recommended for most apps)
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```
- **Use for**: Regular web applications
- **Benefits**: Connection pooling, good performance

### 2. Transaction Pooler (For serverless)
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```
- **Use for**: Vercel, Netlify, AWS Lambda
- **Benefits**: Handles many short-lived connections
- **Note**: Add `?pgbouncer=true` parameter

### 3. Direct Connection
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```
- **Use for**: Long-running applications
- **Benefits**: Direct connection, no pooling overhead

## 🚀 For Serverless Deployments (Vercel, Netlify)

If deploying to serverless platforms, use both:

```bash
# In your .env file
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```

And update `prisma/schema.prisma`:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

## 🛡️ Security Best Practices

1. **Never commit your .env file** (it's already in .gitignore)
2. **Use environment variables** in production
3. **Rotate database passwords** regularly
4. **Enable Row Level Security** in Supabase for extra protection

## 🔍 Troubleshooting

### Connection Issues
- **Check your connection string** format
- **Verify your password** doesn't contain special characters that need encoding
- **Ensure your region** matches your project region

### Migration Issues
- **Database already exists**: Use `npx prisma db push` instead of migrate
- **Permission errors**: Check your database password

### Performance Issues
- **Use connection pooling** (Session/Transaction pooler)
- **Monitor your database** in Supabase dashboard
- **Optimize your queries** using indexes

## 📊 Viewing Your Data

1. **Supabase Dashboard**: Go to your project → Table Editor
2. **Prisma Studio**: Run `npx prisma studio`
3. **Database Tools**: Use pgAdmin, DBeaver, or other PostgreSQL clients

## 🎯 Next Steps

After setting up Supabase:

1. ✅ **Test the connection** - Run `npm run dev`
2. ✅ **Create initial data** - Add departments and admin user
3. ✅ **Deploy to production** - Use environment variables
4. ✅ **Monitor performance** - Use Supabase analytics

---

**🎉 Your MCQ Teacher Evaluation System is now powered by Supabase!**

For more help, check:
- [Supabase Docs](https://supabase.com/docs)
- [Prisma + Supabase Guide](https://supabase.com/docs/guides/database/prisma)