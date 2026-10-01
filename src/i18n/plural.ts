import type { Locale } from './locales'

export interface PluralForms {
  one: string
  few?: string
  many?: string
  other: string
}

const rules = new Map<Locale, Intl.PluralRules>()

// Picks the word form for a count: Russian needs one/few/many
// ("1 устройство, 3 устройства, 5 устройств"), English only one/other.
export function plural(locale: Locale, n: number, forms: PluralForms) {
  let rule = rules.get(locale)
  if (!rule) {
    rule = new Intl.PluralRules(locale)
    rules.set(locale, rule)
  }
  const category = rule.select(n)
  return forms[category as keyof PluralForms] ?? forms.other
}
