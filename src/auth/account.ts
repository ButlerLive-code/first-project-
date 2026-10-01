import { detectPlatform, getPlatform } from '../data/platforms'
import type { Billing, Device, Payment, Preferences, User } from './context'

export const defaultPreferences: Preferences = {
  autoConnect: false,
  killSwitch: true,
  newsletter: false,
}

export function getPreferences(user: User): Preferences {
  return { ...defaultPreferences, ...user.preferences }
}

// Accounts saved before devices existed start with the browser they use now.
export function getDevices(user: User): Device[] {
  if (user.devices) return user.devices
  const platform = detectPlatform()
  return [
    {
      id: 'this-device',
      name: `My ${getPlatform(platform)?.name ?? 'device'}`,
      platform,
      addedAt: user.memberSince,
      current: true,
    },
  ]
}

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

export function renewalDate(payment: Payment) {
  const date = new Date(payment.date)
  if (payment.billing === 'yearly') date.setFullYear(date.getFullYear() + 1)
  else date.setMonth(date.getMonth() + 1)
  return date
}

export function billingLabel(billing: Billing) {
  return billing === 'yearly' ? 'Yearly' : 'Monthly'
}

export function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
