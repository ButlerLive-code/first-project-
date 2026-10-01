import { useParams } from 'react-router'
import { LocalLink } from '../i18n/LocalLink'
import { PageHeader } from '../components/PageHeader'
import { getPlatform, getPlatforms, type Platform } from '../data/platforms'
import { useLocale } from '../i18n/useLocale'
import { usePageMeta } from '../i18n/usePageMeta'
import { useT } from '../i18n/useT'
import { NotFound } from './NotFound'

export function Tutorial() {
  const { platform: id } = useParams()
  const locale = useLocale()
  const platform = getPlatform(id, locale)
  if (!platform) return <NotFound />
  return <TutorialGuide platform={platform} />
}

// Split out so the page meta hook only runs for a platform that exists.
function TutorialGuide({ platform }: { platform: Platform }) {
  const t = useT()
  const locale = useLocale()
  usePageMeta(t.tutorial.metaTitle(platform.name))
  const others = getPlatforms(locale).filter((p) => p.id !== platform.id)

  return (
    <>
      <PageHeader eyebrow={t.tutorial.eyebrow} title={t.tutorial.title(platform.name)}>
        {t.tutorial.meta(platform.requirements, platform.version)}
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

          <h2 className="subheading">{t.tutorial.troubleshooting}</h2>
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
          <h2 className="card-title">{t.tutorial.ready}</h2>
          <LocalLink to="/download" className="btn btn-primary">
            {t.tutorial.downloadFor(platform.name)}
          </LocalLink>
          <p className="form-note">
            {t.tutorial.needHelp}
            <LocalLink to="/faq">{t.tutorial.readFaq}</LocalLink>
          </p>
          <hr />
          <p className="aside-label">{t.tutorial.others}</p>
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
