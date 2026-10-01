import { useEffect, useRef, useState } from 'react'
import { ApiState } from '../../../api/ApiState'
import { useSessions } from '../../../api/useApi'
import { errorMessage } from '../../../api/errorMessage'
import { authClient } from '../../../auth/client'
import { formatDate } from '../../../auth/account'
import { describeAgent } from '../../../auth/sessions'
import { useAuth } from '../../../auth/useAuth'
import { useLocalNavigate } from '../../../i18n/useLocalNavigate'
import { useLocale } from '../../../i18n/useLocale'
import { message, useT, type Message } from '../../../i18n/useT'

export function SessionsCard() {
  const t = useT()
  const locale = useLocale()
  const navigate = useLocalNavigate()
  const { signOutEverywhere } = useAuth()
  const sessions = useSessions()
  const { reload } = sessions
  const sessionId = authClient.useSession().data?.session.id
  const [error, setError] = useState<Message>(null)
  const [busy, setBusy] = useState(false)

  // A password change swaps this device's session and ends the others: re-read
  // the list when the id changes (not on the first render, which already loads).
  const seen = useRef(sessionId)
  useEffect(() => {
    if (seen.current === sessionId) return
    seen.current = sessionId
    if (sessionId) reload()
  }, [sessionId, reload])

  async function handleSignOutEverywhere() {
    setError(null)
    setBusy(true)
    try {
      // Ends this session too; the provider records `leavingFrom` like signOut,
      // so a protected page goes home, not to /signup, while the store catches up.
      await signOutEverywhere()
      navigate('/login', { replace: true })
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
      setBusy(false)
    }
  }

  return (
    <div className="card account-card">
      <h2 className="card-title">{t.settings.sessions.title}</h2>
      <p className="device-meta">{t.settings.sessions.text}</p>
      {!sessions.data ? (
        <ApiState error={sessions.error} onRetry={sessions.reload} />
      ) : (
        <ul className="stat-list">
          {sessions.data.map((s) => (
            <li key={s.id}>
              <span>
                {describeAgent(s.userAgent) ?? t.settings.sessions.unknownDevice}
                {s.current && (
                  <>
                    {' '}
                    <span className="badge badge-green">{t.common.thisDevice}</span>
                  </>
                )}
              </span>
              <span className="device-meta">{t.settings.sessions.signedIn(formatDate(s.createdAt, locale))}</span>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="form-error">{error(t)}</p>}
      <button type="button" className="btn btn-outline" disabled={busy} onClick={handleSignOutEverywhere}>
        {t.settings.sessions.signOutEverywhere}
      </button>
    </div>
  )
}
