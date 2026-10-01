import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { errorMessage } from '../api/errorMessage'
import { LocalLink } from '../i18n/LocalLink'
import { useLocalNavigate } from '../i18n/useLocalNavigate'
import { safeNext } from '../auth/next'
import { useAuth } from '../auth/useAuth'
import { useLocale } from '../i18n/useLocale'
import { message, useT, type Message } from '../i18n/useT'
import { usePageMeta } from '../i18n/usePageMeta'

export function Signup() {
  const t = useT()
  const locale = useLocale()
  usePageMeta(t.signup.metaTitle)
  const { signUp } = useAuth()
  const navigate = useLocalNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'), '/checkout')
  const [error, setError] = useState<Message>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const name = String(form.get('name')).trim()
    const email = String(form.get('email')).trim()
    const password = String(form.get('password'))
    if (password.length < 8) {
      setError(message((t) => t.auth.passwordTooShort))
      return
    }
    setBusy(true)
    try {
      // The confirmation email goes out in the language of this page.
      await signUp({ name, email, password, locale })
      navigate(next, { replace: true })
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
      setBusy(false)
    }
  }

  return (
    <section className="auth container">
      <div className="auth-card">
        <h1 className="auth-title">{t.signup.title}</h1>
        <p className="auth-subtitle">{t.signup.subtitle}</p>

        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span>{t.signup.fullName}</span>
            <input name="name" required autoComplete="name" placeholder={t.signup.namePlaceholder} />
          </label>
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
              autoComplete="new-password"
              placeholder={t.signup.passwordPlaceholder}
              onChange={() => setError(null)}
            />
          </label>
          {error && <p className="form-error">{error(t)}</p>}
          <label className="checkbox">
            <input type="checkbox" required />
            <span>
              {t.signup.agreeBefore}
              <LocalLink to="/terms">{t.signup.terms}</LocalLink>
              {t.signup.agreeMiddle}
              <LocalLink to="/privacy">{t.signup.privacy}</LocalLink>
            </span>
          </label>
          <button type="submit" className="btn btn-primary form-submit" disabled={busy}>
            {t.signup.submit}
          </button>
        </form>

        <p className="auth-switch">
          {t.signup.haveAccount}
          <LocalLink to={`/login?next=${encodeURIComponent(next)}`}>{t.signup.signIn}</LocalLink>
        </p>
      </div>
    </section>
  )
}
