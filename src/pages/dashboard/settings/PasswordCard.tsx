import { useState, type FormEvent } from 'react'
import { ApiError } from '../../../api/client'
import { errorMessage } from '../../../api/errorMessage'
import { authCall } from '../../../auth/authCall'
import { authClient } from '../../../auth/client'
import { useAuth } from '../../../auth/useAuth'
import { useHasPassword } from '../../../auth/useHasPassword'
import { LocalLink } from '../../../i18n/LocalLink'
import { message, useT, type Message } from '../../../i18n/useT'

export function PasswordCard() {
  const t = useT()
  const { refresh } = useAuth()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<Message>(null)
  const [busy, setBusy] = useState(false)
  // A Google-only account has no current password to type.
  const { state: passwordState, retry } = useHasPassword()

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const currentPassword = String(data.get('current'))
    const newPassword = String(data.get('next'))
    if (!currentPassword) return setError(message((t) => t.settings.enterCurrent))
    if (newPassword.length < 8) return setError(message((t) => t.settings.newTooShort))
    if (newPassword !== String(data.get('confirm'))) return setError(message((t) => t.settings.mismatch))
    setBusy(true)
    try {
      // Other devices are signed out and this one gets a fresh session. Skip
      // Better Auth's delayed session signal (it would cancel our refetch, as in
      // sign-in) and re-read the session ourselves.
      await authCall(() =>
        authClient.changePassword({
          currentPassword,
          newPassword,
          revokeOtherSessions: true,
          fetchOptions: { disableSignal: true },
        }),
      )
      await refresh()
      form.reset()
      setSaved(true)
    } catch (err) {
      // Here a wrong password can only be the current one.
      setError(
        err instanceof ApiError && err.code === 'invalid_credentials'
          ? message((t) => t.settings.wrongCurrent)
          : message((t) => errorMessage(t, err)),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card account-card">
      <h2 className="card-title">{t.settings.password}</h2>
      {passwordState === 'loading' ? (
        <p className="form-note" role="status">
          {t.common.loading}
        </p>
      ) : passwordState === 'no' ? (
        <p>
          {t.settings.noPassword} <LocalLink to="/forgot-password">{t.settings.twoFactor.needPasswordLink}</LocalLink>
        </p>
      ) : passwordState === 'error' ? (
        <p className="form-error">
          {t.errors.network}{' '}
          <button type="button" className="link-button" onClick={retry}>
            {t.settings.retry}
          </button>
        </p>
      ) : (
        <form
          className="form"
          onSubmit={handleSubmit}
          onChange={() => {
            setSaved(false)
            setError(null)
          }}
        >
          <label className="field">
            <span>{t.settings.currentPassword}</span>
            <input name="current" type="password" autoComplete="current-password" />
          </label>
          <div className="field-row">
            <label className="field">
              <span>{t.settings.newPassword}</span>
              <input name="next" type="password" autoComplete="new-password" />
            </label>
            <label className="field">
              <span>{t.settings.confirm}</span>
              <input name="confirm" type="password" autoComplete="new-password" />
            </label>
          </div>
          {error && <p className="form-error">{error(t)}</p>}
          {saved && (
            <p className="form-note" role="status">
              {t.settings.passwordUpdated}
            </p>
          )}
          <button type="submit" className="btn btn-outline" disabled={busy}>
            {t.settings.updatePassword}
          </button>
        </form>
      )}
    </div>
  )
}
