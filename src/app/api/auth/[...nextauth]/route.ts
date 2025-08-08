import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
// @ts-expect-error NextAuth type inference differences in v5 app router handlers
const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }