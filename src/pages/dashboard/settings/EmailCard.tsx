import { useState, type FormEvent } from 'react'
import { errorMessage } from '../../../api/errorMessage'
import { authCall } from '../../../auth/authCall'
import { authClient } from '../../../auth/client'
import { useAuth } from '../../../auth/useAuth'
import { message, useT, type Message } from '../../../i18n/useT'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// The address changes only after the link sent to the new address is opened
// (/verify-email); until then the account keeps the old one. Better Auth asks
// for no password here, so a Google-only account can use this card too.
export function EmailCard() {
  const t = useT()
  const { user } = useAuth()
  const [sentTo, setSentTo] = useState('')
  const [error, setError] = useState<Message>(null)
  const [busy, setBusy] = useState(false)

  if (!user) return null

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const newEmail = String(new FormData(form).get('email')).trim().toLowerCase()
    if (!EMAIL.test(newEmail)) return setError(message((t) => t.settings.invalidEmail))
    if (newEmail === user?.email.toLowerCase()) return setError(message((t) => t.settings.email.same))
    setBusy(true)
    try {
      // The reply is the same for a free and a taken address, so this note is too.
      await authCall(() => authClient.changeEmail({ newEmail }))
      setSentTo(newEmail)
      form.reset()
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card account-card">
      <h2 className="card-title">{t.settings.email.title}</h2>
      <p>
        {t.settings.email.currentBefore}
        <b>{user.email}</b>
      </p>
      <form
        className="form"
        noValidate
        onSubmit={handleSubmit}
        onChange={() => {
          setError(null)
          setSentTo('')
        }}
      >
        <label className="field">
          <span>{t.settings.email.newEmail}</span>
          <input name="email" type="email" autoComplete="email" placeholder={t.auth.emailPlaceholder} required />
        </label>
        {error && <p className="form-error">{error(t)}</p>}
        {sentTo && (
          <p className="form-note" role="status">
            {t.settings.email.sentBefore}
            <b>{sentTo}</b>
            {t.settings.email.sentAfter}
          </p>
        )}
        <button type="submit" className="btn btn-outline" disabled={busy}>
          {t.settings.email.submit}
        </button>
      </form>
    </div>
  )
}
