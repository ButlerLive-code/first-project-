import { Link, useLocation } from 'react-router'
import { localize, locales } from './locales'
import { storeLocale } from './storage'
import { useLocale } from './useLocale'
import { useT } from './useT'

// EN / RU toggle: opens the same page, with the same query and hash, in the
// other language and remembers the choice for the next visit to "/".
export function LanguageSwitcher({ onSwitch }: { onSwitch?: () => void }) {
  const { pathname, search, hash } = useLocation()
  const current = useLocale()
  const t = useT()

  return (
    <div className="lang-switch" role="group" aria-label={t.language.label}>
      {locales.map((locale) => (
        <Link
          key={locale}
          to={localize(`${pathname}${search}${hash}`, locale)}
          lang={locale}
          hrefLang={locale}
          aria-label={t.language[locale]}
          aria-current={locale === current ? 'true' : undefined}
          className={locale === current ? 'is-active' : undefined}
          onClick={() => {
            storeLocale(locale)
            onSwitch?.()
          }}
        >
          {locale.toUpperCase()}
        </Link>
      ))}
    </div>
  )
}
