import { isLocale, type Locale } from './locales'

const STORAGE_KEY = 'laslesvpn.locale'

// Storage can be unavailable (private mode); the site then just forgets
// the choice between visits.
export function readStoredLocale(): Locale | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return isLocale(value) ? value : null
  } catch {
    return null
  }
}

export function storeLocale(locale: Locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // ignore
  }
}
