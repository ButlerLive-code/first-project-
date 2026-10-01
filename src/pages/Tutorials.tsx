import { LocalLink } from '../i18n/LocalLink'
import { PageHeader } from '../components/PageHeader'
import { getPlatforms } from '../data/platforms'
import { useLocale } from '../i18n/useLocale'
import { usePageMeta } from '../i18n/usePageMeta'
import { useT } from '../i18n/useT'

export function Tutorials() {
  const t = useT()
  const locale = useLocale()
  usePageMeta(t.tutorials.metaTitle)
  const platforms = getPlatforms(locale)
  return (
    <>
      <PageHeader eyebrow={t.tutorials.eyebrow} title={t.tutorials.title}>
        {t.tutorials.text}
      </PageHeader>

      <section className="container page-section">
        <ul className="platform-grid">
          {platforms.map((p) => (
            <li key={p.id}>
              <LocalLink to={`/tutorials/${p.id}`} className="card platform quick-link">
                <span className="platform-icon" aria-hidden="true">
                  {p.icon}
                </span>
                <span className="card-title">{t.tutorials.cardTitle(p.name)}</span>
                <span>{t.tutorials.cardMeta(p.steps.length)}</span>
              </LocalLink>
            </li>
          ))}
        </ul>

        <div className="notice page-cta">
          <p>{t.tutorials.stuck}</p>
          <LocalLink to="/faq" className="btn btn-primary">
            {t.tutorials.browseFaq}
          </LocalLink>
        </div>
      </section>
    </>
  )
}
