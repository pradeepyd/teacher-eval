import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from './prisma'
import bcrypt from 'bcrypt'
import type { Session } from 'next-auth'

// Custom JWT type with our properties
interface CustomJWT {
  sub?: string
  role?: string
  departmentId?: string | null
  departmentName?: string | null
  [key: string]: any
}

// Extend Session type to include custom properties
interface ExtendedSession extends Session {
  user: {
    id: string
    email: string
    name: string
    role: string
    departmentId: string | null
    departmentName: string | null
  }
}

// Simple in-memory auth rate limiting (per-identifier)
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000 // 5 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 5

const authAttempts = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(key: string): boolean {
	const bucket = authAttempts.get(key)
	const now = Date.now()
	if (!bucket) return false
	if (now >= bucket.resetAt) {
		authAttempts.delete(key)
		return false
	}
	return bucket.count >= RATE_LIMIT_MAX_ATTEMPTS
}

function recordFailedAttempt(key: string) {
	const now = Date.now()
	const existing = authAttempts.get(key)
	if (existing && now < existing.resetAt) {
		existing.count += 1
		authAttempts.set(key, existing)
	} else {
		authAttempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
	}
}

function clearAttempts(key: string) {
	authAttempts.delete(key)
}

export const authOptions = {
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
    async jwt({ token, user }: { token: CustomJWT; user: any }) {
      if (user) {
        token.role = user.role
        token.departmentId = user.departmentId
        token.departmentName = user.departmentName
      }
      return token
    },
    async session({ session, token }: { session: ExtendedSession; token: CustomJWT }) {
      if (token) {
        session.user.id = token.sub || ''
        session.user.role = token.role || ''
        session.user.departmentId = token.departmentId || null
        session.user.departmentName = token.departmentName || null
      }
      return session
    }
  },
  pages: {
    signIn: '/login'
  }
}
