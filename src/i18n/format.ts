import type { Locale } from './locales'

// "2026-09-18" is a calendar date, not a moment: format it in UTC so it never
// shifts to the previous day west of Greenwich.
function dateOptions(iso: string): Intl.DateTimeFormatOptions {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? { timeZone: 'UTC' } : {}
}

export function formatDate(iso: string, locale: Locale, month: 'long' | 'short' = 'long') {
  return new Date(iso).toLocaleDateString(locale, { ...dateOptions(iso), month, day: 'numeric', year: 'numeric' })
}

export function formatMonthYear(iso: string, locale: Locale) {
  return new Date(iso).toLocaleDateString(locale, { ...dateOptions(iso), month: 'short', year: 'numeric' })
}

export function formatNumber(n: number, locale: Locale) {
  return n.toLocaleString(locale, { maximumFractionDigits: 0 })
}

// Prices stay in US dollars; only the notation follows the language.
export function formatPrice(amount: number, locale: Locale) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount)
}

// Exact amounts on invoices and in payment history keep their cents ($9.00).
export function formatAmount(amount: number, locale: Locale) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(amount)
}
