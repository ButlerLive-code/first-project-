import { useState } from 'react'
import { LocalLink } from '../i18n/LocalLink'
import { PageHeader } from '../components/PageHeader'
import { faq } from '../data/faq'

export function Faq() {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const categories = faq
    .map((cat) => ({
      ...cat,
      items: cat.items.filter((item) => `${item.q} ${item.a}`.toLowerCase().includes(q)),
    }))
    .filter((cat) => cat.items.length > 0)

  return (
    <>
      <PageHeader eyebrow="FAQ" title="Frequently asked questions">
        Everything you need to know about LaslesVPN, plans and privacy.
      </PageHeader>

      <section className="container page-section faq">
        <input
          className="search search-wide"
          type="search"
          placeholder="Search questions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search questions"
        />

        {categories.length === 0 && <p className="empty">No answers match “{query}”.</p>}

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
          <p>Didn't find your answer? Our support team is available 24/7.</p>
          <LocalLink to="/help#contact" className="btn btn-primary">
            Contact Support
          </LocalLink>
        </div>
      </section>
    </>
  )
}
