import { createContext } from 'react'
import type { Role, UserLocale } from '../../shared/api'

// The signed-in user as the session reports it. Plan, devices and payments
// come from the API (src/api/useApi.ts), not from here. No Billing type is
// needed here; billing periods live in shared/plans.ts.
export interface AuthUser {
  id: string
  name: string
  email: string
  emailVerified: boolean
  locale: UserLocale
  role: Role
  twoFactorEnabled: boolean
  createdAt: string
}

export interface SignUpInput {
  name: string
  email: string
  password: string
  locale: UserLocale
}

export interface AuthValue {
  user: AuthUser | null
  // True until the first session check finishes; nothing should redirect before that.
  loading: boolean
  // The path the visitor signed out or deleted the account from, until the next
  // sign-in or sign-up. That page sends them home instead of to /signup while
  // the emptied session catches up; other protected pages redirect as usual.
  leavingFrom: string | null
  // 'two-factor' means the password was right and /login/2fa must finish the sign-in.
  signIn: (email: string, password: string) => Promise<'ok' | 'two-factor'>
  // The second sign-in step: a valid code (or backup code) turns the password step into a session.
  completeTwoFactor: (code: string, kind: 'totp' | 'backup') => Promise<void>
  signUp: (input: SignUpInput) => Promise<void>
  signOut: () => Promise<void>
  updateUser: (patch: { name?: string; locale?: UserLocale }) => Promise<void>
  deleteAccount: (password?: string) => Promise<void>
  // Re-reads the session after something changed it elsewhere (email confirmed, 2FA on).
  refresh: () => Promise<void>
}

export const AuthContext = createContext<AuthValue | null>(null)
