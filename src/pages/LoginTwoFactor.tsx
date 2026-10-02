import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { toApiError } from '../api/client'
import { safeNext } from '../auth/next'
import { loginCodeMessage } from '../auth/twoFactorError'
import { useAuth } from '../auth/useAuth'
import { LocalLink } from '../i18n/LocalLink'
import { useLocalNavigate } from '../i18n/useLocalNavigate'
import { usePageMeta } from '../i18n/usePageMeta'
import { message, useT, type Message } from '../i18n/useT'

// Second sign-in step. The password step left a short-lived two_factor cookie;
// a valid code (or backup code) turns it into a normal session. `trustDevice`
// is deliberately not offered: every sign-in asks for a code.
export function LoginTwoFactor() {
  const t = useT()
  usePageMeta(t.twoFactorLogin.metaTitle)
  const { completeTwoFactor } = useAuth()
  const navigate = useLocalNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [useBackup, setUseBackup] = useState(false)
  const [error, setError] = useState<Message>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const code = String(new FormData(e.currentTarget).get('code')).trim()
    setBusy(true)
    try {
      if (useBackup) await completeTwoFactor(code, 'backup')
      else await completeTwoFactor(code.replace(/\s/g, ''), 'totp')
      navigate(next, { replace: true })
    } catch (err) {
      // No two_factor cookie (missing or expired): start over. /login only sends
      // anyone here after a password step or a Google callback that has just set
      // the cookie, so this cannot loop.
      if (toApiError(err).code === 'unauthorized') {
        navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true })
        return
      }
      setError(message((t) => loginCodeMessage(t, err)))
      setBusy(false)
    }
  }

  return (
    <section className="auth container">
      <div className="auth-card">
        <h1 className="auth-title">{t.twoFactorLogin.title}</h1>
        <p className="auth-subtitle">{useBackup ? t.twoFactorLogin.backupSubtitle : t.twoFactorLogin.subtitle}</p>

        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span>{useBackup ? t.twoFactorLogin.backupCode : t.twoFactorLogin.code}</span>
            <input
              key={useBackup ? 'backup' : 'totp'}
              name="code"
              required
              autoFocus
              autoComplete="one-time-code"
              inputMode={useBackup ? 'text' : 'numeric'}
              onChange={() => setError(null)}
            />
          </label>
          {error && <p className="form-error">{error(t)}</p>}
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setUseBackup((v) => !v)
              setError(null)
            }}
          >
            {useBackup ? t.twoFactorLogin.useApp : t.twoFactorLogin.useBackup}
          </button>
          <button type="submit" className="btn btn-primary form-submit" disabled={busy}>
            {t.twoFactorLogin.submit}
          </button>
        </form>

        <p className="auth-switch">
          <LocalLink to={`/login?next=${encodeURIComponent(next)}`}>{t.twoFactorLogin.backToLogin}</LocalLink>
        </p>
      </div>
    </section>
  )
}
