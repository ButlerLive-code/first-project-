import { LocalLink } from '../i18n/LocalLink'
import { PageHeader } from '../components/PageHeader'
import { formatDate } from '../i18n/format'
import { useLocale } from '../i18n/useLocale'
import { usePageMeta } from '../i18n/usePageMeta'
import { useT } from '../i18n/useT'
import { getLegal } from '../data/legal'

export function Legal({ doc: docId }: { doc: 'privacy' | 'terms' }) {
  const t = useT()
  const locale = useLocale()
  const doc = getLegal(docId, locale)
  usePageMeta(doc.title)
  return (
    <>
      <PageHeader eyebrow={t.legal.eyebrow} title={doc.title}>
        {t.legal.lastUpdated(formatDate(doc.updated, locale))}
      </PageHeader>

      <section className="container page-section legal">
        <nav className="card legal-toc" aria-label={t.legal.contents}>
          <p className="aside-label">{t.legal.contents}</p>
          <ul className="aside-links">
            {doc.sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.title}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="legal-body">
          <p className="article-lead">{doc.intro}</p>
          {doc.sections.map((s) => (
            <section key={s.id} id={s.id}>
              <h2 className="subheading">{s.title}</h2>
              {s.paragraphs.map((p) => (
                <p key={p} className="article-p">
                  {p}
                </p>
              ))}
            </section>
          ))}
          <p className="form-note legal-help">
            {t.legal.questionsBefore}
            <LocalLink to="/help#contact">{t.legal.contactLink}</LocalLink>
            {t.legal.questionsAfter}
          </p>
        </div>
      </section>
    </>
  )
}
