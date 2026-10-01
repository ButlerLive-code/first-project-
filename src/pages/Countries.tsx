import { useState } from 'react'
import { LocalLink } from '../i18n/LocalLink'
import { PageHeader } from '../components/PageHeader'
import { countries, countryMatches, placeName, regions, type Region } from '../data/servers'
import { useLocale } from '../i18n/useLocale'
import { usePageMeta } from '../i18n/usePageMeta'
import { useT } from '../i18n/useT'

export function Countries() {
  const t = useT()
  const locale = useLocale()
  usePageMeta(t.countries.metaTitle)
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState<Region | 'all'>('all')
  const visible = countries
    .filter((c) => (region === 'all' || c.region === region) && countryMatches(c, query))
    .sort((a, b) => placeName(a.name, locale).localeCompare(placeName(b.name, locale), locale))

  return (
    <>
      <PageHeader eyebrow={t.countries.eyebrow} title={t.countries.title(countries.length)}>
        {t.countries.text}
      </PageHeader>

      <section className="container page-section">
        <div className="toolbar">
          <input
            className="search"
            type="search"
            placeholder={t.countries.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t.countries.searchLabel}
          />
          <div className="chips">
            {(['all', ...regions] as const).map((r) => (
              <button
                key={r}
                type="button"
                className={`chip${region === r ? ' is-active' : ''}`}
                onClick={() => setRegion(r)}
              >
                {r === 'all' ? t.servers.allRegions : t.regions[r]}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="empty">{t.countries.empty(query)}</p>
        ) : (
          <ul className="country-grid">
            {visible.map((c) => (
              <li key={c.slug}>
                <LocalLink to={`/countries/${c.slug}`} className="card country-card quick-link">
                  <span className="country-flag" aria-hidden="true">
                    {c.flag}
                  </span>
                  <span className="card-title">{placeName(c.name, locale)}</span>
                  <span className="form-note">
                    {t.countries.summary(c.servers.length, c.bestPing)}
                  </span>
                  {c.freeAvailable && <span className="badge badge-green">{t.countries.free}</span>}
                </LocalLink>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
