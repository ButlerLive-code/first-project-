import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { LocalLink } from '../i18n/LocalLink'
import { useAuth } from '../auth/useAuth'
import { PageHeader } from '../components/PageHeader'
import { SuccessCard } from '../components/SuccessCard'
import { getFaq } from '../data/faq'
import { useLocale } from '../i18n/useLocale'
import { usePageMeta } from '../i18n/usePageMeta'
import { useT } from '../i18n/useT'

const topicLinks = [
  { icon: '🚀', to: '/tutorials' },
  { icon: '💳', to: '/faq' },
  { icon: '👤', to: '/dashboard' },
  { icon: '🌍', to: '/servers' },
]

export function Help() {
  const t = useT()
  const locale = useLocale()
  usePageMeta(t.help.metaTitle)
  const allQuestions = getFaq(locale).flatMap((cat) => cat.items.map((item) => ({ ...item, category: cat.title })))
  const { user } = useAuth()
  const [params] = useSearchParams()
  const [query, setQuery] = useState('')
  const [ticket, setTicket] = useState<string | null>(null)
  const q = query.trim().toLowerCase()
  const matches = q ? allQuestions.filter((i) => `${i.q} ${i.a}`.toLowerCase().includes(q)).slice(0, 5) : []
  const initialSubject = t.help.subjects.find((s) => s === params.get('subject')) ?? t.help.subjects[0]

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTicket(`LV-${Math.floor(100000 + Math.random() * 900000)}`)
  }

  return (
    <>
      <PageHeader eyebrow={t.help.eyebrow} title={t.help.title}>
        <input
          className="search search-wide help-search"
          type="search"
          placeholder={t.help.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t.help.searchLabel}
        />
      </PageHeader>

      <section className="container page-section">
        {q && (
          <div className="help-results">
            {matches.length === 0 ? (
              <p className="empty">
                {t.help.noAnswersBefore(query)}
                <a href="#contact">{t.help.askTeam}</a>
                {t.help.noAnswersAfter}
              </p>
            ) : (
              <ul className="aside-links">
                {matches.map((m) => (
                  <li key={m.q}>
                    <LocalLink to="/faq">
                      <span>{m.q}</span>
                      <span className="muted">{m.category}</span>
                    </LocalLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <ul className="benefit-grid">
          {t.help.topics.map((topic, i) => (
            <li key={topic.title}>
              <LocalLink to={topicLinks[i].to} className="card benefit quick-link">
                <span className="platform-icon" aria-hidden="true">
                  {topicLinks[i].icon}
                </span>
                <span className="card-title">{topic.title}</span>
                <span>{topic.text}</span>
              </LocalLink>
            </li>
          ))}
        </ul>

        <div className="contact" id="contact">
          <div>
            <h2 className="section-title">{t.help.contactTitle}</h2>
            <p>{t.help.contactText}</p>
            <ul className="contact-facts">
              <li>{t.help.factReply}</li>
              <li>{t.help.factLanguage}</li>
              <li>
                {t.help.factFaqBefore}
                <LocalLink to="/faq">{t.help.factFaqLink}</LocalLink>
              </li>
            </ul>
          </div>

          {ticket ? (
            <SuccessCard title={t.help.sentTitle} onReset={() => setTicket(null)}>
              <p>
                {t.help.ticketBefore}
                <b>{ticket}</b>
                {t.help.ticketAfter}
              </p>
            </SuccessCard>
          ) : (
            <form className="card form" onSubmit={handleSubmit}>
              <div className="field-row">
                <label className="field">
                  <span>{t.help.name}</span>
                  <input name="name" required defaultValue={user?.name} autoComplete="name" />
                </label>
                <label className="field">
                  <span>{t.help.email}</span>
                  <input name="email" type="email" required defaultValue={user?.email} autoComplete="email" />
                </label>
              </div>
              <label className="field">
                <span>{t.help.topic}</span>
                <select name="subject" defaultValue={initialSubject}>
                  {t.help.subjects.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t.help.message}</span>
                <textarea name="message" required minLength={10} rows={5} placeholder={t.help.messagePlaceholder} />
              </label>
              <button type="submit" className="btn btn-primary form-submit">
                {t.help.send}
              </button>
            </form>
          )}
        </div>
      </section>
    </>
  )
}
