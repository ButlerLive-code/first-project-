import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { authCall } from '../auth/authCall'
import { authClient } from '../auth/client'
import { useAuth } from '../auth/useAuth'
import { verifyOutcome, verifyResult } from '../auth/verify'
import { LocalLink } from '../i18n/LocalLink'
import { usePageMeta } from '../i18n/usePageMeta'
import { useT } from '../i18n/useT'

type Result = 'checking' | 'success' | 'expired' | 'invalid'

// Opened from a confirmation email (sign-up or a new address).
export function VerifyEmail() {
  const t = useT()
  usePageMeta(t.verify.metaTitle)
  const { user, refresh } = useAuth()
  const [params] = useSearchParams()
  const token = params.get('token')
  const [result, setResult] = useState<Result>(token ? 'checking' : 'invalid')
  // StrictMode runs effects twice in development; an email-change token must
  // be sent only once (the second call would no longer find the old address).
  const sent = useRef(false)

  useEffect(() => {
    if (!token || sent.current) return
    sent.current = true
    // disableSignal: Better Auth's delayed session signal would cancel the
    // refresh below (see AuthProvider). The refresh makes a signed-in user's
    // "confirm your email" notice disappear without a reload.
    authCall(() => authClient.verifyEmail({ query: { token }, fetchOptions: { disableSignal: true } })).then(
      async () => {
        await refresh().catch(() => {})
        setResult('success')
      },
      (err: unknown) => setResult(verifyOutcome(err)),
    )
  }, [token, refresh])

  // A new address confirmed in a browser that did not ask for it signs nobody
  // in there (the server drops that session): ask to sign in with it.
  const shown = verifyResult(result, token, Boolean(user))
  const copy = {
    checking: { title: t.verify.checking, text: '' },
    success: { title: t.verify.successTitle, text: t.verify.successText },
    changed: { title: t.verify.changedTitle, text: t.verify.changedText },
    expired: { title: t.verify.expiredTitle, text: t.verify.expiredText },
    invalid: { title: t.verify.invalidTitle, text: t.verify.invalidText },
  }[shown]

  return (
    <section className="auth container">
      <div className="auth-card" role="status">
        <h1 className="auth-title">{copy.title}</h1>
        {copy.text && <p className="auth-subtitle">{copy.text}</p>}
        {result !== 'checking' && (
          <LocalLink to={user ? '/dashboard' : '/login'} className="btn btn-primary form-submit">
            {user ? t.verify.toDashboard : t.verify.toLogin}
          </LocalLink>
        )}
      </div>
    </section>
  )
}
