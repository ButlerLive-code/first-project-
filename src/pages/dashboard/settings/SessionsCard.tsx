import { useEffect, useState } from 'react'
import { errorMessage } from '../../../api/errorMessage'
import { authCall } from '../../../auth/authCall'
import { authClient } from '../../../auth/client'
import { formatDate } from '../../../auth/account'
import { describeAgent } from '../../../auth/sessions'
import { useAuth } from '../../../auth/useAuth'
import { useLocalNavigate } from '../../../i18n/useLocalNavigate'
import { useLocale } from '../../../i18n/useLocale'
import { message, useT, type Message } from '../../../i18n/useT'

interface SessionRow {
  id: string
  userAgent?: string | null
  createdAt: Date
}

export function SessionsCard() {
  const t = useT()
  const locale = useLocale()
  const navigate = useLocalNavigate()
  const { signOutEverywhere } = useAuth()
  const current = authClient.useSession().data?.session.id
  const [sessions, setSessions] = useState<SessionRow[] | null>(null)
  const [error, setError] = useState<Message>(null)
  const [busy, setBusy] = useState(false)

  // Reloads when this device's session id changes (a password change swaps it
  // and ends the others), so the list and the badge never go stale.
  useEffect(() => {
    if (!current) return
    let alive = true
    authCall(() => authClient.listSessions()).then(
      (list) => {
        if (alive) setSessions(list)
      },
      (err: unknown) => {
        if (alive) setError(message((t) => errorMessage(t, err)))
      },
    )
    return () => {
      alive = false
    }
  }, [current])

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
      {sessions && (
        <ul className="stat-list">
          {sessions.map((s) => (
            <li key={s.id}>
              <span>
                {describeAgent(s.userAgent) ?? t.settings.sessions.unknownDevice}
                {s.id === current && (
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
