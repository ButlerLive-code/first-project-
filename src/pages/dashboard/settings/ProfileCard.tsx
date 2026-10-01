import { useState, type FormEvent } from 'react'
import { errorMessage } from '../../../api/errorMessage'
import { useAuth } from '../../../auth/useAuth'
import { message, useT, type Message } from '../../../i18n/useT'

export function ProfileCard() {
  const t = useT()
  const { user, updateUser } = useAuth()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<Message>(null)
  const [busy, setBusy] = useState(false)

  if (!user) return null

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const name = String(new FormData(e.currentTarget).get('name')).trim()
    if (!name) return setError(message((t) => t.settings.enterName))
    setBusy(true)
    try {
      await updateUser({ name })
      setSaved(true)
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card account-card">
      <h2 className="card-title">{t.settings.profile}</h2>
      <form
        className="form"
        noValidate
        onSubmit={handleSubmit}
        onChange={() => {
          setSaved(false)
          setError(null)
        }}
      >
        <label className="field">
          <span>{t.signup.fullName}</span>
          <input name="name" defaultValue={user.name} autoComplete="name" maxLength={80} required />
        </label>
        {error && <p className="form-error">{error(t)}</p>}
        <button type="submit" className="btn btn-outline" disabled={busy}>
          {saved ? t.settings.saved : t.settings.saveChanges}
        </button>
      </form>
    </div>
  )
}
