import { useState, type FormEvent } from 'react'
import { errorMessage } from '../../../api/errorMessage'
import { useAuth } from '../../../auth/useAuth'
import { useLocalNavigate } from '../../../i18n/useLocalNavigate'
import { message, useT, type Message } from '../../../i18n/useT'

export function DeleteAccountCard() {
  const t = useT()
  const { deleteAccount } = useAuth()
  const navigate = useLocalNavigate()
  const [word, setWord] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<Message>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await deleteAccount(password)
      // The session is re-read only after another request, so this navigation
      // lands before RequireAuth could send the visitor to /signup.
      navigate('/', { replace: true })
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
      setBusy(false)
    }
  }

  return (
    <div className="card account-card danger-zone">
      <h2 className="card-title">{t.settings.deleteTitle}</h2>
      <p>{t.settings.deleteText}</p>
      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span>
            {t.settings.typeBefore}
            <b>{t.settings.deleteWord}</b>
            {t.settings.typeAfter}
          </span>
          <input value={word} onChange={(e) => setWord(e.target.value)} autoComplete="off" />
        </label>
        <label className="field">
          <span>{t.settings.deletePassword}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError(null)
            }}
            autoComplete="current-password"
          />
        </label>
        {error && <p className="form-error">{error(t)}</p>}
        <button type="submit" className="btn btn-danger" disabled={busy || word !== t.settings.deleteWord || !password}>
          {t.settings.deleteButton}
        </button>
      </form>
    </div>
  )
}
