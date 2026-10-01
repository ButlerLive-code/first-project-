import { useEffect, useMemo, type ReactNode } from 'react'
import { LocaleContext } from './context'
import { dictionaries } from './dictionaries'
import type { Locale } from './locales'

// The locale comes from the route (/ or /ru), so the URL is the only source
// of truth and the page can never disagree with its address.
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(() => ({ locale, t: dictionaries[locale] }), [locale])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return <LocaleContext value={value}>{children}</LocaleContext>
}
