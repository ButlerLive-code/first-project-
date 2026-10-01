import { Link } from 'react-router'
import map from '../assets/map.svg'
import { PageHeader } from '../components/PageHeader'
import { countries, regions, servers } from '../data/servers'

export function Locations() {
  return (
    <>
      <PageHeader eyebrow="Locations" title="Huge Global Network of Fast VPN">
        {servers.length} servers in {countries.length} countries across {regions.length} regions —
        pick the location closest to you for the best speed.
      </PageHeader>

      <section className="container page-section">
        <img className="network-map" src={map} alt="Map of LaslesVPN server locations" width={1060} height={538} />

        <ul className="stats locations-stats">
          <li className="stat">
            <div>
              <p className="stat-value">{servers.length}</p>
              <p className="stat-label">Servers</p>
            </div>
          </li>
          <li className="stat">
            <div>
              <p className="stat-value">{countries.length}</p>
              <p className="stat-label">Countries</p>
            </div>
          </li>
          <li className="stat">
            <div>
              <p className="stat-value">{servers.filter((s) => !s.premium).length}</p>
              <p className="stat-label">Free locations</p>
            </div>
          </li>
        </ul>

        <div className="region-grid">
          {regions.map((region) => {
            const list = countries.filter((c) => c.region === region)
            return (
              <section key={region} className="card region">
                <h2 className="card-title">{region}</h2>
                <p className="form-note">
                  {list.reduce((n, c) => n + c.servers.length, 0)} servers · {list.length} countries
                </p>
                <ul className="aside-links">
                  {list.map((c) => (
                    <li key={c.slug}>
                      <Link to={`/countries/${c.slug}`}>
                        <span>
                          {c.flag} {c.name}
                        </span>
                        <span className="muted">{c.servers.length}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>

        <div className="page-actions">
          <Link to="/servers" className="btn btn-primary">
            See All Servers
          </Link>
          <Link to="/countries" className="btn btn-outline">
            Browse Countries
          </Link>
        </div>
      </section>
    </>
  )
}
