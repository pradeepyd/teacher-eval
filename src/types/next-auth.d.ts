declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      departmentId: string | null
      departmentName: string | null
    }
  }

  interface User {
    role: string
    departmentId: string | null
    departmentName: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    departmentId: string | null
    departmentName: string | null
  }
}