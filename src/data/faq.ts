import type { Locale } from '../i18n/locales'
import { faq as enFaq } from './faq.en'
import { faq as ruFaq } from './faq.ru'

export interface FaqItem {
  q: string
  a: string
  link?: { label: string; to: string }
}

export interface FaqCategory {
  title: string
  items: FaqItem[]
}

// Link targets are stored without a language prefix; LocalLink adds it.
export function getFaq(locale: Locale): FaqCategory[] {
  return locale === 'ru' ? ruFaq : enFaq
}
