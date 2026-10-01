import { useState, type FormEvent } from 'react'
import { LocalLink } from '../i18n/LocalLink'
import { PageHeader } from '../components/PageHeader'
import { SuccessCard } from '../components/SuccessCard'

const types = [
  { icon: '🏪', title: 'Resellers', text: 'Bundle LaslesVPN with your products and services at wholesale prices.' },
  { icon: '🔌', title: 'Integrations', text: 'Build LaslesVPN into routers, browsers or apps with our partner API.' },
  { icon: '🏢', title: 'Business teams', text: 'Protect your remote team with central billing and dedicated support.' },
]

export function Partners() {
  const [sent, setSent] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSent(true)
  }

  return (
    <>
      <PageHeader eyebrow="Become a Partner" title="Grow with LaslesVPN">
        Whether you sell hardware, build software or run a team, let's make the internet safer
        together.
      </PageHeader>

      <section className="container page-section">
        <ul className="benefit-grid benefit-grid-3">
          {types.map((t) => (
            <li key={t.title} className="card benefit">
              <span className="platform-icon" aria-hidden="true">
                {t.icon}
              </span>
              <h2 className="card-title">{t.title}</h2>
              <p>{t.text}</p>
            </li>
          ))}
        </ul>

        <div className="contact" id="contact">
          <div>
            <h2 className="section-title">Tell us about your company</h2>
            <p>
              Our partnerships team will get back to you within 2 business days. Creators and
              bloggers should look at our <LocalLink to="/affiliate">Affiliate Program</LocalLink> instead.
            </p>
          </div>
          {sent ? (
            <SuccessCard title="Thanks for reaching out!" onReset={() => setSent(false)}>
              <p>Our partnerships team will contact you shortly (demo — nothing was sent).</p>
            </SuccessCard>
          ) : (
            <form className="card form" onSubmit={handleSubmit}>
              <div className="field-row">
                <label className="field">
                  <span>Company</span>
                  <input name="company" required autoComplete="organization" />
                </label>
                <label className="field">
                  <span>Your name</span>
                  <input name="name" required autoComplete="name" />
                </label>
              </div>
              <label className="field">
                <span>Work email</span>
                <input name="email" type="email" required autoComplete="email" />
              </label>
              <label className="field">
                <span>Partnership type</span>
                <select name="type">
                  {types.map((t) => (
                    <option key={t.title}>{t.title}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Message</span>
                <textarea name="message" rows={4} placeholder="What would you like to build together?" />
              </label>
              <button type="submit" className="btn btn-primary form-submit">
                Send Request
              </button>
            </form>
          )}
        </div>
      </section>
    </>
  )
}
