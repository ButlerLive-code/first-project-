import { en, type Dictionary } from './en'
import type { Locale } from './locales'
import { ru } from './ru'

export const dictionaries: Record<Locale, Dictionary> = { en, ru }
