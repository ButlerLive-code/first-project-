import { createContext } from 'react'
import type { PlanId } from '../data/plans'

export interface User {
  name: string
  email: string
  plan: PlanId | null
  memberSince: string
}

export interface AuthValue {
  user: User | null
  signIn: (email: string) => void
  signUp: (name: string, email: string) => void
  signOut: () => void
  updateUser: (patch: Partial<User>) => void
}

export const AuthContext = createContext<AuthValue | null>(null)
