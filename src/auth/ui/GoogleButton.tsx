import { useState } from 'react'
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

  if (!config?.googleEnabled) return null

  async function handleClick() {
    setError(null)
    try {
      await authCall(() => authClient.signIn.social(googleSignInRequest(next, locale)))
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
    }
  }

  return (
    <>
      <button type="button" className="btn btn-outline form-submit" onClick={handleClick}>
        {t.auth.google}
      </button>
      {error && <p className="form-error">{error(t)}</p>}
      <p className="auth-divider">{t.auth.or}</p>
    </>
  )
}
