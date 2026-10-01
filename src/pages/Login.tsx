import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { LocalLink } from '../i18n/LocalLink'
import { useLocalNavigate } from '../i18n/useLocalNavigate'
import { safeNext } from '../auth/next'
import { useAuth } from '../auth/useAuth'
import { useT } from '../i18n/useT'
import { usePageMeta } from '../i18n/usePageMeta'

export function Login() {
  const t = useT()
  usePageMeta(t.login.metaTitle)
  const { signIn } = useAuth()
  const navigate = useLocalNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email')).trim()
    const password = String(form.get('password'))
    if (password.length < 6) {
      setError(t.auth.passwordTooShort)
      return
    }
    signIn(email)
    navigate(next, { replace: true })
  }

  return (
    <section className="auth container">
      <div className="auth-card">
        <h1 className="auth-title">{t.login.title}</h1>
        <p className="auth-subtitle">{t.login.subtitle}</p>

        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span>{t.auth.email}</span>
            <input name="email" type="email" required autoComplete="email" placeholder={t.auth.emailPlaceholder} />
          </label>
          <label className="field">
            <span>{t.auth.password}</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              onChange={() => setError('')}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="button" className="link-button" onClick={() => setResetSent(true)}>
            {t.login.forgot}
          </button>
          {resetSent && <p className="form-note">{t.login.resetSent}</p>}
          <button type="submit" className="btn btn-primary form-submit">
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
