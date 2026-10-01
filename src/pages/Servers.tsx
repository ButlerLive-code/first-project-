import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { useConnectHref } from '../auth/useConnectHref'
import { LoadBar } from '../components/LoadBar'
import { PageHeader } from '../components/PageHeader'
import { regions, servers, type Region } from '../data/servers'

type SortKey = 'country' | 'ping' | 'load'

export function Servers() {
  const { user } = useAuth()
  const connectHref = useConnectHref()
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState<Region | 'all'>('all')
  const [freeOnly, setFreeOnly] = useState(false)
  const [sort, setSort] = useState<SortKey>('ping')

  const q = query.trim().toLowerCase()
  const visible = servers
    .filter(
      (s) =>
        (region === 'all' || s.region === region) &&
        (!freeOnly || !s.premium) &&
        `${s.city} ${s.country}`.toLowerCase().includes(q),
    )
    .sort((a, b) => (sort === 'country' ? a.country.localeCompare(b.country) : a[sort] - b[sort]))

  const canUse = (premium: boolean) => !premium || user?.plan === 'premium'

  return (
    <>
      <PageHeader eyebrow="Servers" title="Live server status">
        Pick a server with low ping and load for the fastest connection. Premium servers are
        unlocked with the <Link to="/checkout?plan=premium">Premium plan</Link>.
      </PageHeader>

      <section className="container page-section">
        <div className="toolbar">
          <input
            className="search"
            type="search"
            placeholder="Search city or country…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search servers"
          />
          <select
            className="select"
            value={region}
            onChange={(e) => setRegion(e.target.value as Region | 'all')}
            aria-label="Region"
          >
            <option value="all">All regions</option>
            {regions.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <select
            className="select"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort by"
          >
            <option value="ping">Sort by ping</option>
            <option value="load">Sort by load</option>
            <option value="country">Sort by country</option>
          </select>
          <label className="checkbox">
            <input type="checkbox" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} />
            <span>Free only</span>
          </label>
        </div>

        {visible.length === 0 ? (
          <p className="empty">No servers match your filters.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Region</th>
                  <th>Ping</th>
                  <th>Load</th>
                  <th>Plan</th>
                  <th aria-label="Action" />
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link to={`/countries/${s.countrySlug}`} className="table-location">
                        <span aria-hidden="true">{s.flag}</span>
                        <span>
                          <b>{s.city}</b>
                          <br />
                          <span className="muted">{s.country}</span>
                        </span>
                      </Link>
                    </td>
                    <td>{s.region}</td>
                    <td>{s.ping} ms</td>
                    <td>
                      <LoadBar load={s.load} />
                    </td>
                    <td>
                      <span className={`badge${s.premium ? '' : ' badge-green'}`}>
                        {s.premium ? 'Premium' : 'Free'}
                      </span>
                    </td>
                    <td>
                      {canUse(s.premium) || !user ? (
                        <Link to={connectHref(s.id)} className="btn btn-outline btn-sm">
                          Connect
                        </Link>
                      ) : (
                        <Link to="/checkout?plan=premium" className="btn btn-outline btn-sm">
                          Upgrade
                        </Link>
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
