import type { Locale } from '../i18n/locales'
import { privacy as enPrivacy, terms as enTerms } from './legal.en'
import { privacy as ruPrivacy, terms as ruTerms } from './legal.ru'

export interface LegalDoc {
  title: string
  updated: string
  intro: string
  sections: { id: string; title: string; paragraphs: string[] }[]
}

// Section ids are anchors and must match across languages.
export function getLegal(doc: 'privacy' | 'terms', locale: Locale): LegalDoc {
  if (locale === 'ru') return doc === 'privacy' ? ruPrivacy : ruTerms
  return doc === 'privacy' ? enPrivacy : enTerms
}
