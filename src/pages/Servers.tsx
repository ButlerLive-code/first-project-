import { useState } from 'react'
import { LocalLink } from '../i18n/LocalLink'
import { premiumAction } from '../api/premiumAction'
import { useMe } from '../api/useApi'
import { useAuth } from '../auth/useAuth'
import { useConnectHref } from '../auth/useConnectHref'
import { LoadBar } from '../components/LoadBar'
import { PageHeader } from '../components/PageHeader'
import { matchesQuery, placeName, regions, servers, type Region } from '../data/servers'
import { useLocale } from '../i18n/useLocale'
import { usePageMeta } from '../i18n/usePageMeta'
import { useT } from '../i18n/useT'

type SortKey = 'country' | 'ping' | 'load'

export function Servers() {
  const t = useT()
  const locale = useLocale()
  usePageMeta(t.servers.metaTitle)
  const { user } = useAuth()
  const meState = useMe()
  const connectHref = useConnectHref()
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState<Region | 'all'>('all')
  const [freeOnly, setFreeOnly] = useState(false)
  const [sort, setSort] = useState<SortKey>('ping')

  const visible = servers
    .filter(
      (s) =>
        (region === 'all' || s.region === region) &&
        (!freeOnly || !s.premium) &&
        matchesQuery(s, query),
    )
    .sort((a, b) => (sort === 'country' ? placeName(a.country, locale).localeCompare(placeName(b.country, locale), locale) : a[sort] - b[sort]))

  const action = (premium: boolean) => (premium ? premiumAction(!!user, meState) : 'connect')

  return (
    <>
      <PageHeader eyebrow={t.servers.eyebrow} title={t.servers.title}>
        {t.servers.textBefore}
        <LocalLink to="/checkout?plan=premium">{t.servers.premiumPlan}</LocalLink>
        {t.servers.textAfter}
      </PageHeader>

      <section className="container page-section">
        <div className="toolbar">
          <input
            className="search"
            type="search"
            placeholder={t.servers.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t.servers.searchLabel}
          />
          <select
            className="select"
            value={region}
            onChange={(e) => setRegion(e.target.value as Region | 'all')}
            aria-label={t.servers.regionLabel}
          >
            <option value="all">{t.servers.allRegions}</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {t.regions[r]}
              </option>
            ))}
          </select>
          <select
            className="select"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label={t.servers.sortLabel}
          >
            <option value="ping">{t.servers.sortPing}</option>
            <option value="load">{t.servers.sortLoad}</option>
            <option value="country">{t.servers.sortCountry}</option>
          </select>
          <label className="checkbox">
            <input type="checkbox" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} />
            <span>{t.servers.freeOnly}</span>
          </label>
        </div>

        {visible.length === 0 ? (
          <p className="empty">{t.servers.empty}</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t.servers.colLocation}</th>
                  <th>{t.servers.colRegion}</th>
                  <th>{t.servers.colPing}</th>
                  <th>{t.servers.colLoad}</th>
                  <th>{t.servers.colPlan}</th>
                  <th aria-label={t.servers.colAction} />
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <LocalLink to={`/countries/${s.countrySlug}`} className="table-location">
                        <span aria-hidden="true">{s.flag}</span>
                        <span>
                          <b>{placeName(s.city, locale)}</b>
                          <br />
                          <span className="muted">{placeName(s.country, locale)}</span>
                        </span>
                      </LocalLink>
                    </td>
                    <td>{t.regions[s.region]}</td>
                    <td>{t.servers.ping(s.ping)}</td>
                    <td>
                      <LoadBar load={s.load} />
                    </td>
                    <td>
                      <span className={`badge${s.premium ? '' : ' badge-green'}`}>
                        {s.premium ? t.servers.premium : t.servers.free}
                      </span>
                    </td>
                    <td>
                      {action(s.premium) === 'connect' ? (
                        <LocalLink to={connectHref(s.id)} className="btn btn-outline btn-sm">
                          {t.servers.connect}
                        </LocalLink>
                      ) : action(s.premium) === 'pending' ? (
                        <button type="button" className="btn btn-outline btn-sm" disabled>
                          {t.common.loading}
                        </button>
                      ) : (
                        <LocalLink to="/checkout?plan=premium" className="btn btn-outline btn-sm">
                          {t.servers.upgrade}
                        </LocalLink>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
