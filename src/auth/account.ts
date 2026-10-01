import { detectPlatform, getPlatform } from '../data/platforms'
import { formatDate as formatLocalDate } from '../i18n/format'
import type { Locale } from '../i18n/locales'
import type { Device, Payment, Preferences, User } from './context'

export const defaultPreferences: Preferences = {
  autoConnect: false,
  killSwitch: true,
  newsletter: false,
}

export function getPreferences(user: User): Preferences {
  return { ...defaultPreferences, ...user.preferences }
}

// Accounts saved before devices existed start with the browser they use now.
// `defaultName` builds the label of the first device in the page language.
export function getDevices(user: User, defaultName: (platform?: string) => string): Device[] {
  if (user.devices) return user.devices
  const platform = detectPlatform()
  return [
    {
      id: 'this-device',
      name: // Platform names are not translated, so the language does not matter here.
      defaultName(getPlatform(platform, 'en')?.name),
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

export function formatDate(value: string | Date, locale: Locale) {
  return formatLocalDate(typeof value === 'string' ? value : value.toISOString(), locale, 'short')
}
