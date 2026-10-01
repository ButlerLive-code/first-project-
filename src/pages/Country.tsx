import { useParams } from 'react-router'
import { LocalLink } from '../i18n/LocalLink'
import { useConnectHref } from '../auth/useConnectHref'
import { LoadBar } from '../components/LoadBar'
import { PageHeader } from '../components/PageHeader'
import { countries, getCountry, placeName, type Country as CountryData } from '../data/servers'
import { useLocale } from '../i18n/useLocale'
import { usePageMeta } from '../i18n/usePageMeta'
import { useT } from '../i18n/useT'
import { NotFound } from './NotFound'

export function Country() {
  const { slug } = useParams()
  const country = getCountry(slug)
  if (!country) return <NotFound />
  return <CountryPage country={country} />
}

// Split out so the page meta hook only runs for a country that exists.
function CountryPage({ country }: { country: CountryData }) {
  const connectHref = useConnectHref()
  const t = useT()
  const locale = useLocale()
  const countryName = placeName(country.name, locale)
  usePageMeta(t.country.metaTitle(countryName))

  const nearby = countries
    .filter((c) => c.region === country.region && c.slug !== country.slug)
    .sort((a, b) => placeName(a.name, locale).localeCompare(placeName(b.name, locale), locale))

  return (
    <>
      <PageHeader eyebrow={t.regions[country.region]} title={t.country.title(country.flag, countryName)}>
        {t.country.text(countryName, country.servers.length, country.bestPing)}
      </PageHeader>

      <section className="container page-section">
        <ul className="server-cards">
          {country.servers.map((s) => (
            <li key={s.id} className="card server-card">
              <div>
                <h2 className="card-title">{placeName(s.city, locale)}</h2>
                <p className="form-note">{s.premium ? t.country.premium : t.country.allPlans}</p>
              </div>
              <dl className="server-stats">
                <div>
                  <dt>{t.country.ping}</dt>
                  <dd>{t.servers.ping(s.ping)}</dd>
                </div>
                <div>
                  <dt>{t.country.load}</dt>
                  <dd>
                    <LoadBar load={s.load} />
                  </dd>
                </div>
              </dl>
              <LocalLink to={connectHref(s.id)} className="btn btn-primary">
                {t.country.connectTo(placeName(s.city, locale))}
              </LocalLink>
            </li>
          ))}
        </ul>

        {nearby.length > 0 && (
          <>
            <h2 className="subheading">{t.country.otherIn(t.regions[country.region])}</h2>
            <ul className="chips">
              {nearby.map((c) => (
                <li key={c.slug}>
                  <LocalLink to={`/countries/${c.slug}`} className="chip">
                    {c.flag} {placeName(c.name, locale)}
                  </LocalLink>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="page-actions">
          <LocalLink to="/countries" className="btn btn-outline">
            {t.country.allCountries}
          </LocalLink>
        </div>
      </section>
    </>
  )
}
