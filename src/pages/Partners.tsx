import { useState, type FormEvent } from 'react'
import { LocalLink } from '../i18n/LocalLink'
import { PageHeader } from '../components/PageHeader'
import { SuccessCard } from '../components/SuccessCard'
import { usePageMeta } from '../i18n/usePageMeta'
import { useT } from '../i18n/useT'

// Texts live in the dictionary; icons stay here, matched by index.
const typeIcons = ['🏪', '🔌', '🏢']

export function Partners() {
  const t = useT()
  const p = t.partners
  usePageMeta(p.metaTitle)
  const [sent, setSent] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSent(true)
  }

  return (
    <>
      <PageHeader eyebrow={p.eyebrow} title={p.title}>
        {p.text}
      </PageHeader>

      <section className="container page-section">
        <ul className="benefit-grid benefit-grid-3">
          {p.types.map((type, i) => (
            <li key={type.title} className="card benefit">
              <span className="platform-icon" aria-hidden="true">
                {typeIcons[i]}
              </span>
              <h2 className="card-title">{type.title}</h2>
              <p>{type.text}</p>
            </li>
          ))}
        </ul>

        <div className="contact" id="contact">
          <div>
            <h2 className="section-title">{p.formTitle}</h2>
            <p>
              {p.formTextBefore}
              <LocalLink to="/affiliate">{p.affiliateLink}</LocalLink>
              {p.formTextAfter}
            </p>
          </div>
          {sent ? (
            <SuccessCard title={p.sentTitle} onReset={() => setSent(false)}>
              <p>{p.sentText}</p>
            </SuccessCard>
          ) : (
            <form className="card form" onSubmit={handleSubmit}>
              <div className="field-row">
                <label className="field">
                  <span>{p.company}</span>
                  <input name="company" required autoComplete="organization" />
                </label>
                <label className="field">
                  <span>{p.name}</span>
                  <input name="name" required autoComplete="name" />
                </label>
              </div>
              <label className="field">
                <span>{p.email}</span>
                <input name="email" type="email" required autoComplete="email" />
              </label>
              <label className="field">
                <span>{p.type}</span>
                <select name="type">
                  {p.types.map((type) => (
                    <option key={type.title}>{type.title}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{p.message}</span>
                <textarea name="message" rows={4} placeholder={p.messagePlaceholder} />
              </label>
              <button type="submit" className="btn btn-primary form-submit">
                {p.send}
              </button>
            </form>
          )}
        </div>
      </section>
    </>
  )
}
