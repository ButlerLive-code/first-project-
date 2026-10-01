import { useState } from 'react'
import { LocalLink } from '../i18n/LocalLink'
import { PageHeader } from '../components/PageHeader'
import { getFaq } from '../data/faq'
import { useLocale } from '../i18n/useLocale'
import { usePageMeta } from '../i18n/usePageMeta'
import { useT } from '../i18n/useT'

export function Faq() {
  const t = useT()
  const locale = useLocale()
  usePageMeta(t.faqPage.metaTitle)
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const categories = getFaq(locale)
    .map((cat) => ({
      ...cat,
      items: cat.items.filter((item) => `${item.q} ${item.a}`.toLowerCase().includes(q)),
    }))
    .filter((cat) => cat.items.length > 0)

  return (
    <>
      <PageHeader eyebrow={t.faqPage.eyebrow} title={t.faqPage.title}>
        {t.faqPage.text}
      </PageHeader>

      <section className="container page-section faq">
        <input
          className="search search-wide"
          type="search"
          placeholder={t.faqPage.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t.faqPage.searchLabel}
        />

        {categories.length === 0 && <p className="empty">{t.faqPage.noMatch(query)}</p>}

        {categories.map((cat) => (
          <section key={cat.title}>
            <h2 className="subheading">{cat.title}</h2>
            <div className="accordion">
              {cat.items.map((item) => (
                <details key={item.q} className="accordion-item" open={q.length > 0}>
                  <summary>{item.q}</summary>
                  <p>
                    {item.a}
                    {item.link && (
                      <>
                        {' '}
                        <LocalLink to={item.link.to}>{item.link.label} →</LocalLink>
                      </>
                    )}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ))}

        <div className="notice page-cta">
          <p>{t.faqPage.notFound}</p>
          <LocalLink to="/help#contact" className="btn btn-primary">
            {t.faqPage.contact}
          </LocalLink>
        </div>
      </section>
    </>
  )
}
