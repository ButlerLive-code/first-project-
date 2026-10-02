import { useState, type FormEvent } from 'react'
import { errorMessage } from '../api/errorMessage'
import { authCall } from '../auth/authCall'
import { authClient } from '../auth/client'
import { LocalLink } from '../i18n/LocalLink'
import { usePageMeta } from '../i18n/usePageMeta'
import { message, useT, type Message } from '../i18n/useT'

export function ForgotPassword() {
  const t = useT()
  usePageMeta(t.forgot.metaTitle)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<Message>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const email = String(new FormData(e.currentTarget).get('email')).trim()
    setBusy(true)
    setError(null)
    try {
      // The answer is the same whether or not the account exists.
      await authCall(() => authClient.requestPasswordReset({ email }))
      setSent(true)
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="auth container">
      <div className="auth-card">
        <h1 className="auth-title">{t.forgot.title}</h1>
        <p className="auth-subtitle">{t.forgot.subtitle}</p>
        {sent ? (
          <p className="form-note" role="status">
            {t.forgot.sent}
          </p>
        ) : (
          <form className="form" onSubmit={handleSubmit}>
            <label className="field">
              <span>{t.auth.email}</span>
              <input name="email" type="email" required autoComplete="email" placeholder={t.auth.emailPlaceholder} />
            </label>
            {error && <p className="form-error">{error(t)}</p>}
            <button type="submit" className="btn btn-primary form-submit" disabled={busy}>
              {t.forgot.submit}
            </button>
          </form>
        )}
        <p className="auth-switch">
          <LocalLink to="/login">{t.forgot.backToLogin}</LocalLink>
        </p>
      </div>
    </section>
  )
}
