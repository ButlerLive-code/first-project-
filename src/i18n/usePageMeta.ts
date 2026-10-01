import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { localize, locales, stripLocale } from './locales'
import { useT } from './useT'

function upsert(selector: string, create: () => HTMLElement, attr: string, value: string) {
  let el = document.head.querySelector<HTMLElement>(selector)
  if (!el) {
    el = create()
    document.head.append(el)
  }
  el.setAttribute(attr, value)
}

// Sets the tab title, description and en/ru alternates. Every routed page
// calls it once at the top; without a title it falls back to the site name.
export function usePageMeta(title?: string, description?: string) {
  const t = useT()
  const { pathname } = useLocation()

  useEffect(() => {
    document.title = title ? `${title} — ${t.meta.siteName}` : t.meta.defaultTitle
    upsert(
      'meta[name="description"]',
      () => Object.assign(document.createElement('meta'), { name: 'description' }),
      'content',
      description ?? t.meta.defaultDescription,
    )
    const { path } = stripLocale(pathname)
    for (const locale of locales) {
      upsert(
        `link[rel="alternate"][hreflang="${locale}"]`,
        () => Object.assign(document.createElement('link'), { rel: 'alternate', hreflang: locale }),
        'href',
        window.location.origin + localize(path, locale),
      )
    }
  }, [title, description, pathname, t])
}
