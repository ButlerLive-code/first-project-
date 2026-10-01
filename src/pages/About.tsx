import { LocalLink } from '../i18n/LocalLink'
import { PageHeader } from '../components/PageHeader'
import { countries, servers } from '../data/servers'
import { usePageMeta } from '../i18n/usePageMeta'
import { useT } from '../i18n/useT'

// Texts live in the dictionary; icons and people stay here, matched by index.
const valueIcons = ['🔐', '😊', '🤝']

const team = [
  { name: 'Lena Laslo', initials: 'LL' },
  { name: 'Marco Esposito', initials: 'ME' },
  { name: 'Aiko Tanaka', initials: 'AT' },
  { name: 'Daniel Okafor', initials: 'DO' },
]

export function About() {
  const t = useT()
  usePageMeta(t.about.metaTitle)
  return (
    <>
      <PageHeader eyebrow={t.about.eyebrow} title={t.about.title}>
        {t.about.text}
      </PageHeader>

      <section className="container page-section">
        <ul className="stats about-stats">
          {[
            ['90+', t.about.happyUsers],
            [`${countries.length}`, t.about.countries],
            [`${servers.length}`, t.about.servers],
          ].map(([value, label]) => (
            <li key={label} className="stat">
              <div>
                <p className="stat-value">{value}</p>
                <p className="stat-label">{label}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="about-story">
          <h2 className="section-title">{t.about.storyTitle}</h2>
          {t.about.story.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>

        <h2 className="subheading">{t.about.believeTitle}</h2>
        <ul className="benefit-grid benefit-grid-3">
          {t.about.values.map((v, i) => (
            <li key={v.title} className="card benefit">
              <span className="platform-icon" aria-hidden="true">
                {valueIcons[i]}
              </span>
              <h3 className="card-title">{v.title}</h3>
              <p>{v.text}</p>
            </li>
          ))}
        </ul>

        <h2 className="subheading">{t.about.teamTitle}</h2>
        <ul className="team-grid">
          {team.map((m, i) => (
            <li key={m.name} className="card team-member">
              <span className="avatar" aria-hidden="true">
                {m.initials}
              </span>
              <b>{m.name}</b>
              <span>{t.about.roles[i]}</span>
            </li>
          ))}
        </ul>

        <div className="page-actions">
          <LocalLink to="/partners" className="btn btn-primary">
            {t.about.partner}
          </LocalLink>
          <LocalLink to="/help#contact" className="btn btn-outline">
            {t.about.contact}
          </LocalLink>
        </div>
      </section>
    </>
  )
}
