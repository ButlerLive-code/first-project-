import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { errorMessage } from '../api/errorMessage'
import { LocalLink } from '../i18n/LocalLink'
import { useLocalNavigate } from '../i18n/useLocalNavigate'
import { safeNext } from '../auth/next'
import { useAuth } from '../auth/useAuth'
import { message, useT, type Message } from '../i18n/useT'
import { usePageMeta } from '../i18n/usePageMeta'

export function Login() {
  const t = useT()
  usePageMeta(t.login.metaTitle)
  const { signIn } = useAuth()
  const navigate = useLocalNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  // After a password reset the email is passed along so it does not need retyping.
  const presetEmail = params.get('email') ?? ''
  const afterReset = params.get('reset') === '1'
  const [error, setError] = useState<Message>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email')).trim()
    const password = String(form.get('password'))
    setBusy(true)
    try {
      const result = await signIn(email, password)
      if (result === 'two-factor') navigate(`/login/2fa?next=${encodeURIComponent(next)}`, { replace: true })
      else navigate(next, { replace: true })
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
      setBusy(false)
    }
  }

  return (
    <section className="auth container">
      <div className="auth-card">
        <h1 className="auth-title">{t.login.title}</h1>
        <p className="auth-subtitle">{t.login.subtitle}</p>
        {afterReset && (
          <p className="form-note" role="status">
            {t.login.passwordChanged}
          </p>
        )}

        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span>{t.auth.email}</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder={t.auth.emailPlaceholder}
              defaultValue={presetEmail}
            />
          </label>
          <label className="field">
            <span>{t.auth.password}</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              onChange={() => setError(null)}
            />
          </label>
          {error && <p className="form-error">{error(t)}</p>}
          <LocalLink to="/forgot-password" className="link-button">
            {t.login.forgot}
          </LocalLink>
          <button type="submit" className="btn btn-primary form-submit" disabled={busy}>
            {t.login.submit}
          </button>
        </form>

        <p className="auth-switch">
          {t.login.newHere}{' '}
          <LocalLink to={`/signup?next=${encodeURIComponent(next)}`}>{t.login.createAccount}</LocalLink>
        </p>
      </div>
    </section>
  )
}
