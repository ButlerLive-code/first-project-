import type { DevMail as Mail } from '../../shared/api'
import { ApiState } from '../api/ApiState'
import { useApi, useConfig } from '../api/useApi'
import { formatDate } from '../i18n/format'
import { useLocale } from '../i18n/useLocale'
import { usePageMeta } from '../i18n/usePageMeta'
import { useT } from '../i18n/useT'
import { NotFound } from './NotFound'

// Splits a plain-text mail into text and clickable links.
function linkify(text: string) {
  return text.split(/(https?:\/\/\S+)/g).map((part, i) =>
    i % 2 ? (
      <a key={i} href={part}>
        {part}
      </a>
    ) : (
      part
    ),
  )
}

// Development only: the mail the API would have sent. Hidden unless /api/config says devMail.
export function DevMail() {
  const t = useT()
  const locale = useLocale()
  usePageMeta(t.devMail.metaTitle)
  const config = useConfig()
  const mails = useApi<Mail[]>(config.data?.devMail ? '/api/dev/mail' : null)

  if (config.data && !config.data.devMail) return <NotFound />

  return (
    <section className="dev-mail container">
      <h1 className="section-title">{t.devMail.title}</h1>
      <p>{t.devMail.text}</p>
      <button type="button" className="btn btn-outline" onClick={mails.reload}>
        {t.devMail.refresh}
      </button>
      {!mails.data ? (
        <ApiState error={config.error ?? mails.error} onRetry={config.error ? config.reload : mails.reload} />
      ) : mails.data.length === 0 ? (
        <p>{t.devMail.empty}</p>
      ) : (
        <ul className="dev-mail-list">
          {mails.data.map((mail) => (
            <li key={mail.id} className="card">
              <h2 className="card-title">{mail.subject}</h2>
              <p className="device-meta">
                {t.devMail.to} {mail.to} · {formatDate(mail.createdAt, locale)}
              </p>
              <pre className="dev-mail-text">{linkify(mail.text)}</pre>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
