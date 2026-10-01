import { createContext } from 'react'
import { en, type Dictionary } from './en'
import type { Locale } from './locales'

export interface LocaleValue {
  locale: Locale
  t: Dictionary
}

export const LocaleContext = createContext<LocaleValue>({ locale: 'en', t: en })
