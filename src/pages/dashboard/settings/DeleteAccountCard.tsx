import { useState, type FormEvent } from 'react'
import { errorMessage } from '../../../api/errorMessage'
import { useAuth } from '../../../auth/useAuth'
import { useHasPassword } from '../../../auth/useHasPassword'
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
  // A Google-only account has no password to ask for.
  const { state: passwordState, retry } = useHasPassword()
  const needsPassword = passwordState === 'yes'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await deleteAccount(needsPassword ? password : undefined)
      // deleteAccount records `leavingFrom`, so RequireAuth sends the visitor home
      // rather than to sign-in while the session store catches up.
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
        {needsPassword && (
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
        )}
        {passwordState === 'error' && (
          <p className="form-error">
            {t.errors.network}{' '}
            <button type="button" className="link-button" onClick={retry}>
              {t.settings.retry}
            </button>
          </p>
        )}
        {error && <p className="form-error">{error(t)}</p>}
        <button
          type="submit"
          className="btn btn-danger"
          disabled={
            busy ||
            passwordState === 'loading' ||
            passwordState === 'error' ||
            word !== t.settings.deleteWord ||
            (needsPassword && !password)
          }
        >
          {t.settings.deleteButton}
        </button>
      </form>
    </div>
  )
}
