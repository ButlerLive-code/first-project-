import { createContext } from 'react'
import type { PlanId } from '../data/plans'

export type Billing = 'monthly' | 'yearly'

export interface Device {
  id: string
  name: string
  platform: string
  addedAt: string
  current?: boolean
}

export interface Payment {
  id: string
  date: string
  plan: PlanId
  billing: Billing
  amount: number
}

export interface SavedCard {
  brand: string
  last4: string
  expiry: string
}

export interface Preferences {
  autoConnect: boolean
  killSwitch: boolean
  newsletter: boolean
}

// Fields added after the first release are optional so sessions saved by
// older versions of the site still load.
export interface User {
  name: string
  email: string
  plan: PlanId | null
  memberSince: string
  billing?: Billing
  devices?: Device[]
  payments?: Payment[]
  card?: SavedCard
  preferences?: Preferences
}

export interface AuthValue {
  user: User | null
  signIn: (email: string) => void
  signUp: (name: string, email: string) => void
  signOut: () => void
  updateUser: (patch: Partial<User>) => void
  deleteAccount: () => void
}

export const AuthContext = createContext<AuthValue | null>(null)
