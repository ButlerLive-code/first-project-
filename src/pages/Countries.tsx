import { useState } from 'react'
import { Link } from 'react-router'
import { PageHeader } from '../components/PageHeader'
import { countries, regions, type Region } from '../data/servers'

export function Countries() {
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState<Region | 'all'>('all')
  const q = query.trim().toLowerCase()
  const visible = countries.filter(
    (c) => (region === 'all' || c.region === region) && c.name.toLowerCase().includes(q),
  )

  return (
    <>
      <PageHeader eyebrow="Countries" title={`LaslesVPN in ${countries.length} countries`}>
        Get a local IP address wherever you need one. Free locations are marked — everything else
        is included in Premium.
      </PageHeader>

      <section className="container page-section">
        <div className="toolbar">
          <input
            className="search"
            type="search"
            placeholder="Search countries…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search countries"
          />
          <div className="chips">
            {(['all', ...regions] as const).map((r) => (
              <button
                key={r}
                type="button"
                className={`chip${region === r ? ' is-active' : ''}`}
                onClick={() => setRegion(r)}
              >
                {r === 'all' ? 'All regions' : r}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="empty">No countries match “{query}”.</p>
        ) : (
          <ul className="country-grid">
            {visible.map((c) => (
              <li key={c.slug}>
                <Link to={`/countries/${c.slug}`} className="card country-card quick-link">
                  <span className="country-flag" aria-hidden="true">
                    {c.flag}
                  </span>
                  <span className="card-title">{c.name}</span>
                  <span className="form-note">
                    {c.servers.length} {c.servers.length === 1 ? 'server' : 'servers'} · from{' '}
                    {c.bestPing} ms
                  </span>
                  {c.freeAvailable && <span className="badge badge-green">Free</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
