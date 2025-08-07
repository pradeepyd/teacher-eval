declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      departmentId: string
      departmentName: string
    }
  }

  interface User {
    role: string
    departmentId: string
    departmentName: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    departmentId: string
    departmentName: string
  }
}