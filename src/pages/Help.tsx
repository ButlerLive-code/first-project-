import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { PageHeader } from '../components/PageHeader'
import { SuccessCard } from '../components/SuccessCard'
import { faq } from '../data/faq'

const topics = [
  { icon: '🚀', title: 'Getting started', text: 'Install the app and connect for the first time.', to: '/tutorials' },
  { icon: '💳', title: 'Plans & billing', text: 'Upgrade, downgrade or change billing period.', to: '/faq' },
  { icon: '👤', title: 'Your account', text: 'Update your profile, plan and devices.', to: '/dashboard' },
  { icon: '🌍', title: 'Servers & speed', text: 'Find the fastest location for you.', to: '/servers' },
]

const subjects = ['Connection problem', 'Billing question', 'Account help', 'Feedback', 'Something else']

const allQuestions = faq.flatMap((cat) => cat.items.map((item) => ({ ...item, category: cat.title })))

export function Help() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const [query, setQuery] = useState('')
  const [ticket, setTicket] = useState<string | null>(null)
  const q = query.trim().toLowerCase()
  const matches = q ? allQuestions.filter((i) => `${i.q} ${i.a}`.toLowerCase().includes(q)).slice(0, 5) : []
  const initialSubject = subjects.find((s) => s === params.get('subject')) ?? subjects[0]

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTicket(`LV-${Math.floor(100000 + Math.random() * 900000)}`)
  }

  return (
    <>
      <PageHeader eyebrow="Help Center" title="How can we help?">
        <input
          className="search search-wide help-search"
          type="search"
          placeholder="Search for answers…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search help"
        />
      </PageHeader>

      <section className="container page-section">
        {q && (
          <div className="help-results">
            {matches.length === 0 ? (
              <p className="empty">
                No answers for “{query}”. <a href="#contact">Ask our team</a> instead.
              </p>
            ) : (
              <ul className="aside-links">
                {matches.map((m) => (
                  <li key={m.q}>
                    <Link to="/faq">
                      <span>{m.q}</span>
                      <span className="muted">{m.category}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <ul className="benefit-grid">
          {topics.map((t) => (
            <li key={t.title}>
              <Link to={t.to} className="card benefit quick-link">
                <span className="platform-icon" aria-hidden="true">
                  {t.icon}
                </span>
                <span className="card-title">{t.title}</span>
                <span>{t.text}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="contact" id="contact">
          <div>
            <h2 className="section-title">Contact support</h2>
            <p>
              Our team answers 24/7, usually within a few hours. Include your device and the server
              you were using so we can help faster.
            </p>
            <ul className="contact-facts">
              <li>⏱️ Average reply: under 4 hours</li>
              <li>🌐 Support in English</li>
              <li>
                📚 Quick answers in the <Link to="/faq">FAQ</Link>
              </li>
            </ul>
          </div>

          {ticket ? (
            <SuccessCard title="Message sent!" onReset={() => setTicket(null)}>
              <p>
                Your ticket number is <b>{ticket}</b>. We'll reply to your email soon (demo — no
                message was actually sent).
              </p>
            </SuccessCard>
          ) : (
            <form className="card form" onSubmit={handleSubmit}>
              <div className="field-row">
                <label className="field">
                  <span>Name</span>
                  <input name="name" required defaultValue={user?.name} autoComplete="name" />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input name="email" type="email" required defaultValue={user?.email} autoComplete="email" />
                </label>
              </div>
              <label className="field">
                <span>Topic</span>
                <select name="subject" defaultValue={initialSubject}>
                  {subjects.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Message</span>
                <textarea name="message" required minLength={10} rows={5} placeholder="Tell us what's going on…" />
              </label>
              <button type="submit" className="btn btn-primary form-submit">
                Send Message
              </button>
            </form>
          )}
        </div>
      </section>
    </>
  )
}
