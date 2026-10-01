export const locales = ['en', 'ru'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'en'

export function isLocale(value: unknown): value is Locale {
  return (locales as readonly unknown[]).includes(value)
}

export function prefix(locale: Locale) {
  return locale === defaultLocale ? '' : `/${locale}`
}

// Splits a pathname into its locale and the locale-free path. Only a whole
// segment counts: "/russia" is an English page, "/ru" and "/ru/" are Russian.
export function stripLocale(pathname: string): { locale: Locale; path: string } {
  for (const locale of locales) {
    const p = prefix(locale)
    if (p && (pathname === p || pathname.startsWith(`${p}/`))) {
      return { locale, path: pathname.slice(p.length) || '/' }
    }
  }
  return { locale: defaultLocale, path: pathname }
}

// Points an in-app path at the given language, keeping ?query and #hash.
// Safe to apply twice; relative paths and external URLs are returned as is.
export function localize(to: string, locale: Locale) {
  if (!to.startsWith('/') || to.startsWith('//')) return to
  const cut = to.search(/[?#]/)
  const pathname = cut === -1 ? to : to.slice(0, cut)
  const tail = cut === -1 ? '' : to.slice(cut)
  const { path } = stripLocale(pathname)
  const p = prefix(locale)
  if (!p) return path + tail
  return (path === '/' ? p : p + path) + tail
}

// A visitor who picked a language before and opens the bare root is sent to
// that language once; direct links to inner pages are always respected.
export function initialRedirect(
  url: { pathname: string; search: string; hash: string },
  stored: Locale | null,
): string | null {
  if (url.pathname !== '/' || !stored || stored === defaultLocale) return null
  return localize(`/${url.search}${url.hash}`, stored)
}
