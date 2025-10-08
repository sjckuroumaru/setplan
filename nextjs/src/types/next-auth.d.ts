import { DefaultSession, DefaultUser } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      username: string
      isAdmin: boolean
      departmentId: string | null
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    username: string
    isAdmin: boolean
    departmentId: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string
    username: string
    isAdmin: boolean
    departmentId: string | null
  }
}