import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from './prisma'
import bcrypt from 'bcrypt'

// Simple in-memory rate limiter for credential logins (per email)
// Limits to 5 failed attempts per 15 minutes window
const loginAttempts = new Map<string, { count: number; firstAttemptTs: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const record = loginAttempts.get(key)
  if (!record) return false
  if (now - record.firstAttemptTs > WINDOW_MS) {
    loginAttempts.delete(key)
    return false
  }
  return record.count >= MAX_ATTEMPTS
}

function recordFailedAttempt(key: string) {
  const now = Date.now()
  const record = loginAttempts.get(key)
  if (!record) {
    loginAttempts.set(key, { count: 1, firstAttemptTs: now })
  } else {
    if (now - record.firstAttemptTs > WINDOW_MS) {
      loginAttempts.set(key, { count: 1, firstAttemptTs: now })
    } else {
      record.count += 1
      loginAttempts.set(key, record)
    }
  }
}

function clearAttempts(key: string) {
  loginAttempts.delete(key)
}

export const authOptions: any = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Basic throttling by email
        if (isRateLimited(credentials.email)) {
          // Slight delay to make enumeration harder
          await new Promise((res) => setTimeout(res, 150))
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          },
          include: {
            department: true
          }
        })

        if (!user) {
          recordFailedAttempt(credentials.email)
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          recordFailedAttempt(credentials.email)
          return null
        }

        clearAttempts(credentials.email)

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          departmentId: user.departmentId,
          departmentName: user.department?.name || null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.role = user.role
        token.departmentId = user.departmentId
        token.departmentName = user.departmentName
      }
      return token
    },
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.departmentId = (token.departmentId || null) as string | null
        session.user.departmentName = (token.departmentName || null) as string | null
      }
      return session
    }
  },
  pages: {
    signIn: '/login'
  }
}