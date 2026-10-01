import { LocalLink } from '../i18n/LocalLink'
import map from '../assets/map.svg'
import { PageHeader } from '../components/PageHeader'
import { countries, placeName, regions, servers } from '../data/servers'
import { useLocale } from '../i18n/useLocale'
import { usePageMeta } from '../i18n/usePageMeta'
import { useT } from '../i18n/useT'

export function Locations() {
  const t = useT()
  const locale = useLocale()
  usePageMeta(t.locations.metaTitle)
  return (
    <>
      <PageHeader eyebrow={t.locations.eyebrow} title={t.locations.title}>
        {t.locations.text(servers.length, countries.length, regions.length)}
      </PageHeader>

      <section className="container page-section">
        <img className="network-map" src={map} alt={t.locations.mapAlt} width={1060} height={538} />

        <ul className="stats locations-stats">
          <li className="stat">
            <div>
              <p className="stat-value">{servers.length}</p>
              <p className="stat-label">{t.locations.statServers}</p>
            </div>
          </li>
          <li className="stat">
            <div>
              <p className="stat-value">{countries.length}</p>
              <p className="stat-label">{t.locations.statCountries}</p>
            </div>
          </li>
          <li className="stat">
            <div>
              <p className="stat-value">{servers.filter((s) => !s.premium).length}</p>
              <p className="stat-label">{t.locations.statFree}</p>
            </div>
          </li>
        </ul>

        <div className="region-grid">
          {regions.map((region) => {
            const list = countries
              .filter((c) => c.region === region)
              .sort((a, b) => placeName(a.name, locale).localeCompare(placeName(b.name, locale), locale))
            return (
              <section key={region} className="card region">
                <h2 className="card-title">{t.regions[region]}</h2>
                <p className="form-note">
                  {t.locations.regionSummary(
                    list.reduce((n, c) => n + c.servers.length, 0),
                    list.length,
                  )}
                </p>
                <ul className="aside-links">
                  {list.map((c) => (
                    <li key={c.slug}>
                      <LocalLink to={`/countries/${c.slug}`}>
                        <span>
                          {c.flag} {placeName(c.name, locale)}
                        </span>
                        <span className="muted">{c.servers.length}</span>
                      </LocalLink>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>

        <div className="page-actions">
          <LocalLink to="/servers" className="btn btn-primary">
            {t.locations.seeAll}
          </LocalLink>
          <LocalLink to="/countries" className="btn btn-outline">
            {t.locations.browse}
          </LocalLink>
        </div>
      </section>
    </>
  )
}
