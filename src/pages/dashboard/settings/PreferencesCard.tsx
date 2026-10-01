import { useState } from 'react'
import type { Preferences } from '../../../../shared/api'
import { ApiState } from '../../../api/ApiState'
import { apiFetch } from '../../../api/client'
import { errorMessage } from '../../../api/errorMessage'
import { useMe } from '../../../api/useApi'
import { message, useT, type Message } from '../../../i18n/useT'

const toggleKeys: (keyof Preferences)[] = ['autoConnect', 'killSwitch', 'newsletter']

export function PreferencesCard() {
  const t = useT()
  const me = useMe()
  const [error, setError] = useState<Message>(null)
  const preferences = me.data?.preferences

  async function toggle(key: keyof Preferences) {
    if (!me.data) return
    const before = me.data
    // Flip at once; roll back if the server says no.
    me.setData({ ...before, preferences: { ...before.preferences, [key]: !before.preferences[key] } })
    setError(null)
    try {
      const preferences = await apiFetch<Preferences>('/api/me/preferences', {
        method: 'PATCH',
        body: { [key]: !before.preferences[key] },
      })
      me.setData({ ...before, preferences })
    } catch (err) {
      me.setData(before)
      setError(message((t) => errorMessage(t, err)))
    }
  }

  return (
    <div className="card account-card">
      <h2 className="card-title">{t.settings.preferences}</h2>
      <p className="device-meta">{t.settings.synced}</p>
      {preferences ? (
        <ul className="switch-list">
          {toggleKeys.map((key) => (
            <li key={key}>
              <label className="switch">
                <span>
                  <b>{t.settings.toggles[key].title}</b>
                  <span>{t.settings.toggles[key].text}</span>
                </span>
                <input type="checkbox" role="switch" checked={preferences[key]} onChange={() => toggle(key)} />
                <span className="switch-track" aria-hidden="true" />
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <ApiState error={me.error} onRetry={me.reload} />
      )}
      {error && <p className="form-error">{error(t)}</p>}
    </div>
  )
}
