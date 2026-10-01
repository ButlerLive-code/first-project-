import { LocalLink } from '../i18n/LocalLink'
import { PageHeader } from '../components/PageHeader'
import { platforms } from '../data/platforms'

export function Tutorials() {
  return (
    <>
      <PageHeader eyebrow="Tutorials" title="Setup guides for every platform">
        Step-by-step instructions to install LaslesVPN, sign in and get protected.
      </PageHeader>

      <section className="container page-section">
        <ul className="platform-grid">
          {platforms.map((p) => (
            <li key={p.id}>
              <LocalLink to={`/tutorials/${p.id}`} className="card platform quick-link">
                <span className="platform-icon" aria-hidden="true">
                  {p.icon}
                </span>
                <span className="card-title">LaslesVPN for {p.name}</span>
                <span>{p.steps.length} steps · about 2 minutes</span>
              </LocalLink>
            </li>
          ))}
        </ul>

        <div className="notice page-cta">
          <p>Stuck on something that isn't covered here?</p>
          <LocalLink to="/faq" className="btn btn-primary">
            Browse the FAQ
          </LocalLink>
        </div>
      </section>
    </>
  )
}
