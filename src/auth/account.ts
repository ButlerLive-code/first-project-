import { formatDate as formatLocalDate } from '../i18n/format'
import type { Locale } from '../i18n/locales'

// Dates from the API are ISO timestamps; account pages show them short.
export function formatDate(value: string | Date, locale: Locale) {
  return formatLocalDate(typeof value === 'string' ? value : value.toISOString(), locale, 'short')
}
