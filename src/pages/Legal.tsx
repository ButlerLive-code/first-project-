import { LocalLink } from '../i18n/LocalLink'
import { PageHeader } from '../components/PageHeader'
import { formatDate } from '../i18n/format'
import { useLocale } from '../i18n/useLocale'
import type { LegalDoc } from '../data/legal'

export function Legal({ doc }: { doc: LegalDoc }) {
  const locale = useLocale()
  return (
    <>
      <PageHeader eyebrow="Legal" title={doc.title}>
        Last updated {formatDate(doc.updated, locale)}
      </PageHeader>

      <section className="container page-section legal">
        <nav className="card legal-toc" aria-label="Contents">
          <p className="aside-label">Contents</p>
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
            Questions? <LocalLink to="/help#contact">Contact our team</LocalLink>.
          </p>
        </div>
      </section>
    </>
  )
}
