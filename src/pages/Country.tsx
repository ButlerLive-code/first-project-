import { useParams } from 'react-router'
import { LocalLink } from '../i18n/LocalLink'
import { useConnectHref } from '../auth/useConnectHref'
import { LoadBar } from '../components/LoadBar'
import { PageHeader } from '../components/PageHeader'
import { countries, getCountry } from '../data/servers'
import { NotFound } from './NotFound'

export function Country() {
  const { slug } = useParams()
  const connectHref = useConnectHref()
  const country = getCountry(slug)
  if (!country) return <NotFound />

  const nearby = countries.filter((c) => c.region === country.region && c.slug !== country.slug)

  return (
    <>
      <PageHeader eyebrow={country.region} title={`${country.flag} VPN in ${country.name}`}>
        Browse with a {country.name} IP address on {country.servers.length}{' '}
        {country.servers.length === 1 ? 'server' : 'servers'}. Fastest ping: {country.bestPing} ms.
      </PageHeader>

      <section className="container page-section">
        <ul className="server-cards">
          {country.servers.map((s) => (
            <li key={s.id} className="card server-card">
              <div>
                <h2 className="card-title">{s.city}</h2>
                <p className="form-note">{s.premium ? 'Premium' : 'Available on all plans'}</p>
              </div>
              <dl className="server-stats">
                <div>
                  <dt>Ping</dt>
                  <dd>{s.ping} ms</dd>
                </div>
                <div>
                  <dt>Load</dt>
                  <dd>
                    <LoadBar load={s.load} />
                  </dd>
                </div>
              </dl>
              <LocalLink to={connectHref(s.id)} className="btn btn-primary">
                Connect to {s.city}
              </LocalLink>
            </li>
          ))}
        </ul>

        {nearby.length > 0 && (
          <>
            <h2 className="subheading">Other locations in {country.region}</h2>
            <ul className="chips">
              {nearby.map((c) => (
                <li key={c.slug}>
                  <LocalLink to={`/countries/${c.slug}`} className="chip">
                    {c.flag} {c.name}
                  </LocalLink>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="page-actions">
          <LocalLink to="/countries" className="btn btn-outline">
            ← All Countries
          </LocalLink>
        </div>
      </section>
    </>
  )
}
