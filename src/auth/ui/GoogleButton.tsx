import { useEffect, useState } from 'react'
import { errorMessage } from '../../api/errorMessage'
import { useConfig } from '../../api/useApi'
import { useLocale } from '../../i18n/useLocale'
import { message, useT, type Message } from '../../i18n/useT'
import { authCall } from '../authCall'
import { authClient } from '../client'
import { googleSignInRequest } from '../google'

// Shown only when the server has Google keys (/api/config). Better Auth sends
// the browser to Google and back to `next` in the current language. The return
// is a full page load, so the session is read fresh there: no refetch needed.
export function GoogleButton({ next }: { next: string }) {
  const t = useT()
  const locale = useLocale()
  const { data: config } = useConfig()
  const [error, setError] = useState<Message>(null)
  const [busy, setBusy] = useState(false)

  // Coming back from Google with the back button can restore this page from
  // the back/forward cache with the button still busy.
  useEffect(() => {
    const reset = (e: PageTransitionEvent) => {
      if (e.persisted) setBusy(false)
    }
    window.addEventListener('pageshow', reset)
    return () => window.removeEventListener('pageshow', reset)
  }, [])

  if (!config?.googleEnabled) return null

  async function handleClick() {
    setError(null)
    setBusy(true)
    try {
      await authCall(() => authClient.signIn.social(googleSignInRequest(next, locale)))
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
      setBusy(false)
    }
    // On success the browser is leaving for Google: stay busy until it does.
  }

  return (
    <>
      <button type="button" className="btn btn-outline form-submit" disabled={busy} onClick={handleClick}>
        {t.auth.google}
      </button>
      {error && <p className="form-error">{error(t)}</p>}
      <p className="auth-divider">{t.auth.or}</p>
    </>
  )
}
