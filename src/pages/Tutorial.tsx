import { useParams } from 'react-router'
import { LocalLink } from '../i18n/LocalLink'
import { PageHeader } from '../components/PageHeader'
import { getPlatform, platforms } from '../data/platforms'
import { NotFound } from './NotFound'

export function Tutorial() {
  const { platform: id } = useParams()
  const platform = getPlatform(id)
  if (!platform) return <NotFound />

  const others = platforms.filter((p) => p.id !== platform.id)

  return (
    <>
      <PageHeader eyebrow="Tutorials" title={`How to set up LaslesVPN on ${platform.name}`}>
        {platform.requirements} · Version {platform.version}
      </PageHeader>

      <section className="container page-section tutorial">
        <div>
          <ol className="steps">
            {platform.steps.map((step, i) => (
              <li key={step.title} className="step">
                <span className="step-number">{i + 1}</span>
                <div>
                  <h2 className="card-title">{step.title}</h2>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <h2 className="subheading">Troubleshooting</h2>
          <div className="accordion">
            {platform.troubleshooting.map((t) => (
              <details key={t.problem} className="accordion-item">
                <summary>{t.problem}</summary>
                <p>{t.fix}</p>
              </details>
            ))}
          </div>
        </div>

        <aside className="card tutorial-aside">
          <span className="platform-icon" aria-hidden="true">
            {platform.icon}
          </span>
          <h2 className="card-title">Ready to install?</h2>
          <LocalLink to="/download" className="btn btn-primary">
            Download for {platform.name}
          </LocalLink>
          <p className="form-note">
            Need help? <LocalLink to="/faq">Read the FAQ</LocalLink>
          </p>
          <hr />
          <p className="aside-label">Other platforms</p>
          <ul className="aside-links">
            {others.map((p) => (
              <li key={p.id}>
                <LocalLink to={`/tutorials/${p.id}`}>
                  {p.icon} {p.name}
                </LocalLink>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </>
  )
}
