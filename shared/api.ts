// Shapes of the JSON the API server returns. The site and the server both
// import these, so a renamed field breaks the build instead of a page.
import type { Billing, PlanId } from './plans.ts'

export const errorCodes = [
  'invalid_credentials',
  'email_not_verified',
  'account_banned',
  'token_expired',
  'token_invalid',
  'weak_password',
  'email_taken',
  'device_limit',
  'card_declined',
  'validation_failed',
  'rate_limited',
  'unauthorized',
  'forbidden',
  'not_found',
  'server_error',
] as const
export type ErrorCode = (typeof errorCodes)[number]

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && (errorCodes as readonly string[]).includes(value)
}

// Every error response has this body and only this body.
export interface ErrorBody {
  error: { code: ErrorCode }
}

export const locales = ['en', 'ru'] as const
export type UserLocale = (typeof locales)[number]

export const roles = ['customer', 'admin', 'support', 'finance'] as const
export type Role = (typeof roles)[number]

export const platformIds = ['windows', 'macos', 'ios', 'android', 'linux'] as const
export type PlatformId = (typeof platformIds)[number]

export interface AppConfig {
  googleEnabled: boolean
  devMail: boolean
}

export interface Profile {
  id: string
  name: string
  email: string
  emailVerified: boolean
  locale: UserLocale
  role: Role
  twoFactorEnabled: boolean
  createdAt: string
}

export interface Subscription {
  // The plan in force right now: a cancelled plan turns into 'free' once renewsAt passes.
  plan: PlanId
  billing: Billing | null
  status: 'active' | 'canceled'
  renewsAt: string | null
  createdAt: string
}

export interface Preferences {
  autoConnect: boolean
  killSwitch: boolean
  newsletter: boolean
}

export interface Me {
  user: Profile
  subscription: Subscription | null
  preferences: Preferences
}

// One signed-in browser of the current user. The raw token and IP stay on the server.
export interface SessionInfo {
  id: string
  createdAt: string
  updatedAt: string
  userAgent: string | null
  current: boolean
}

export interface Device {
  id: string
  name: string
  platform: PlatformId
  createdAt: string
}

export interface Payment {
  id: string
  plan: PlanId
  billing: Billing
  // Cents.
  amount: number
  cardBrand: string
  cardLast4: string
  status: 'succeeded'
  createdAt: string
}

export interface CheckoutResult {
  subscription: Subscription
  payment: Payment | null
}

export interface DevMail {
  id: number
  to: string
  subject: string
  text: string
  html: string
  createdAt: string
}
