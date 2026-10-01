import { startTransition, useState, type FormEvent } from 'react'
import { useLocalNavigate } from '../../i18n/useLocalNavigate'
import { getPreferences } from '../../auth/account'
import type { Preferences } from '../../auth/context'
import { useAuth } from '../../auth/useAuth'
import { usePageMeta } from '../../i18n/usePageMeta'
import { message, useT, type Message } from '../../i18n/useT'

const toggleKeys: (keyof Preferences)[] = ['autoConnect', 'killSwitch', 'newsletter']

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function Settings() {
  const { user, updateUser, deleteAccount } = useAuth()
  const navigate = useLocalNavigate()
  const t = useT()
  usePageMeta(t.settings.metaTitle)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState<Message>(null)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordError, setPasswordError] = useState<Message>(null)
  const [deleteText, setDeleteText] = useState('')

  if (!user) return null

  const preferences = getPreferences(user)

  function handleProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const name = String(data.get('name')).trim()
    const email = String(data.get('email')).trim().toLowerCase()
    if (!name) return setProfileError(message((t) => t.settings.enterName))
    if (!EMAIL.test(email)) return setProfileError(message((t) => t.settings.invalidEmail))
    updateUser({ name, email })
    setProfileSaved(true)
  }

  function handlePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const next = String(data.get('next'))
    if (!String(data.get('current'))) return setPasswordError(message((t) => t.settings.enterCurrent))
    if (next.length < 6) return setPasswordError(message((t) => t.settings.newTooShort))
    if (next !== String(data.get('confirm'))) return setPasswordError(message((t) => t.settings.mismatch))
    // Demo: passwords are never stored, so there is nothing to compare or save.
    form.reset()
    setPasswordSaved(true)
  }

  function toggle(key: keyof Preferences) {
    updateUser({ preferences: { ...preferences, [key]: !preferences[key] } })
  }

  function handleDelete(e: FormEvent) {
    e.preventDefault()
    // Same transition trick as Sign Out, so RequireAuth doesn't send us to /signup.
    startTransition(() => {
      navigate('/')
      deleteAccount()
    })
  }

  return (
    <div className="account-section account-grid">
      <div className="card account-card">
        <h2 className="card-title">{t.settings.profile}</h2>
        <form className="form" noValidate onSubmit={handleProfile} onChange={() => {
          setProfileSaved(false)
          setProfileError(null)
        }}>
          <label className="field">
            <span>{t.signup.fullName}</span>
            <input name="name" defaultValue={user.name} autoComplete="name" required />
          </label>
          <label className="field">
            <span>{t.auth.email}</span>
            <input name="email" type="email" defaultValue={user.email} autoComplete="email" required />
          </label>
          {profileError && <p className="form-error">{profileError(t)}</p>}
          <button type="submit" className="btn btn-outline">
            {profileSaved ? t.settings.saved : t.settings.saveChanges}
          </button>
        </form>
      </div>

      <div className="card account-card">
        <h2 className="card-title">{t.settings.password}</h2>
        <form className="form" onSubmit={handlePassword} onChange={() => {
          setPasswordSaved(false)
          setPasswordError(null)
        }}>
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
          {passwordError && <p className="form-error">{passwordError(t)}</p>}
          {passwordSaved && (
            <p className="form-note" role="status">
              {t.settings.passwordUpdated}
            </p>
          )}
          <button type="submit" className="btn btn-outline">
            {t.settings.updatePassword}
          </button>
        </form>
      </div>

      <div className="card account-card">
        <h2 className="card-title">{t.settings.preferences}</h2>
        <p className="device-meta">{t.settings.synced}</p>
        <ul className="switch-list">
          {toggleKeys.map((key) => (
            <li key={key}>
              <label className="switch">
                <span>
                  <b>{t.settings.toggles[key].title}</b>
                  <span>{t.settings.toggles[key].text}</span>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={preferences[key]}
                  onChange={() => toggle(key)}
                />
                <span className="switch-track" aria-hidden="true" />
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="card account-card danger-zone">
        <h2 className="card-title">{t.settings.deleteTitle}</h2>
        <p>{t.settings.deleteText}</p>
        <form className="form" onSubmit={handleDelete}>
          <label className="field">
            <span>
              {t.settings.typeBefore}
              <b>{t.settings.deleteWord}</b>
              {t.settings.typeAfter}
            </span>
            <input value={deleteText} onChange={(e) => setDeleteText(e.target.value)} autoComplete="off" />
          </label>
          <button type="submit" className="btn btn-danger" disabled={deleteText !== t.settings.deleteWord}>
            {t.settings.deleteButton}
          </button>
        </form>
      </div>
    </div>
  )
}
