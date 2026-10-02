import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { errorMessage } from '../api/errorMessage'
import { authCall } from '../auth/authCall'
import { authClient } from '../auth/client'
import { LocalLink } from '../i18n/LocalLink'
import { useLocalNavigate } from '../i18n/useLocalNavigate'
import { usePageMeta } from '../i18n/usePageMeta'
import { message, useT, type Message } from '../i18n/useT'

// Opened from the reset email: /reset-password?token=…&email=…
export function ResetPassword() {
  const t = useT()
  usePageMeta(t.reset.metaTitle)
  const navigate = useLocalNavigate()
  const [params] = useSearchParams()
  const token = params.get('token')
  const email = params.get('email') ?? ''
  const [error, setError] = useState<Message>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!token) return
    const data = new FormData(e.currentTarget)
    const newPassword = String(data.get('next'))
    if (newPassword.length < 8) return setError(message((t) => t.auth.passwordTooShort))
    if (newPassword !== String(data.get('confirm'))) return setError(message((t) => t.settings.mismatch))
    setBusy(true)
    try {
      await authCall(() => authClient.resetPassword({ token, newPassword }))
      // Every session was revoked; sign in again with the new password.
      navigate(`/login?reset=1&email=${encodeURIComponent(email)}`, { replace: true })
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
      setBusy(false)
    }
  }

  return (
    <section className="auth container">
      <div className="auth-card">
        <h1 className="auth-title">{t.reset.title}</h1>
        {token ? (
          <>
            <p className="auth-subtitle">{t.reset.subtitle}</p>
            <form className="form" onSubmit={handleSubmit} onChange={() => setError(null)}>
              <label className="field">
                <span>{t.settings.newPassword}</span>
                <input name="next" type="password" required autoComplete="new-password" placeholder={t.signup.passwordPlaceholder} />
              </label>
              <label className="field">
                <span>{t.settings.confirm}</span>
                <input name="confirm" type="password" required autoComplete="new-password" />
              </label>
              {error && <p className="form-error">{error(t)}</p>}
              <button type="submit" className="btn btn-primary form-submit" disabled={busy}>
                {t.reset.submit}
              </button>
            </form>
          </>
        ) : (
          <p className="form-error">{t.reset.missingToken}</p>
        )}
        <p className="auth-switch">
          <LocalLink to="/forgot-password">{t.reset.requestNew}</LocalLink>
        </p>
      </div>
    </section>
  )
}
