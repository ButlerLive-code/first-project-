import { startTransition, useState, type FormEvent } from 'react'
import { useLocalNavigate } from '../../i18n/useLocalNavigate'
import { getPreferences } from '../../auth/account'
import type { Preferences } from '../../auth/context'
import { useAuth } from '../../auth/useAuth'

const toggles: { key: keyof Preferences; title: string; text: string }[] = [
  {
    key: 'autoConnect',
    title: 'Auto-connect',
    text: 'Connect to the fastest server as soon as the app starts.',
  },
  {
    key: 'killSwitch',
    title: 'Kill switch',
    text: 'Block internet traffic if the VPN connection drops unexpectedly.',
  },
  {
    key: 'newsletter',
    title: 'Product news',
    text: 'Occasional emails about new locations, features and offers.',
  },
]

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function Settings() {
  const { user, updateUser, deleteAccount } = useAuth()
  const navigate = useLocalNavigate()
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [deleteText, setDeleteText] = useState('')

  if (!user) return null

  const preferences = getPreferences(user)

  function handleProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const name = String(data.get('name')).trim()
    const email = String(data.get('email')).trim().toLowerCase()
    if (!name) return setProfileError('Enter your name.')
    if (!EMAIL.test(email)) return setProfileError('Enter a valid email address.')
    updateUser({ name, email })
    setProfileSaved(true)
  }

  function handlePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const next = String(data.get('next'))
    if (!String(data.get('current'))) return setPasswordError('Enter your current password.')
    if (next.length < 6) return setPasswordError('The new password needs at least 6 characters.')
    if (next !== String(data.get('confirm'))) return setPasswordError("The new passwords don't match.")
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
        <h2 className="card-title">Profile</h2>
        <form className="form" noValidate onSubmit={handleProfile} onChange={() => {
          setProfileSaved(false)
          setProfileError('')
        }}>
          <label className="field">
            <span>Full name</span>
            <input name="name" defaultValue={user.name} autoComplete="name" required />
          </label>
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" defaultValue={user.email} autoComplete="email" required />
          </label>
          {profileError && <p className="form-error">{profileError}</p>}
          <button type="submit" className="btn btn-outline">
            {profileSaved ? 'Saved ✓' : 'Save Changes'}
          </button>
        </form>
      </div>

      <div className="card account-card">
        <h2 className="card-title">Password</h2>
        <form className="form" onSubmit={handlePassword} onChange={() => {
          setPasswordSaved(false)
          setPasswordError('')
        }}>
          <label className="field">
            <span>Current password</span>
            <input name="current" type="password" autoComplete="current-password" />
          </label>
          <div className="field-row">
            <label className="field">
              <span>New password</span>
              <input name="next" type="password" autoComplete="new-password" />
            </label>
            <label className="field">
              <span>Confirm</span>
              <input name="confirm" type="password" autoComplete="new-password" />
            </label>
          </div>
          {passwordError && <p className="form-error">{passwordError}</p>}
          {passwordSaved && (
            <p className="form-note" role="status">
              Password updated. Use it next time you sign in.
            </p>
          )}
          <button type="submit" className="btn btn-outline">
            Update Password
          </button>
        </form>
      </div>

      <div className="card account-card">
        <h2 className="card-title">App preferences</h2>
        <p className="device-meta">Synced to every device signed in to your account.</p>
        <ul className="switch-list">
          {toggles.map((item) => (
            <li key={item.key}>
              <label className="switch">
                <span>
                  <b>{item.title}</b>
                  <span>{item.text}</span>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={preferences[item.key]}
                  onChange={() => toggle(item.key)}
                />
                <span className="switch-track" aria-hidden="true" />
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="card account-card danger-zone">
        <h2 className="card-title">Delete account</h2>
        <p>
          This removes your profile, devices and payment history from this browser and signs you
          out. It can't be undone.
        </p>
        <form className="form" onSubmit={handleDelete}>
          <label className="field">
            <span>
              Type <b>DELETE</b> to confirm
            </span>
            <input value={deleteText} onChange={(e) => setDeleteText(e.target.value)} autoComplete="off" />
          </label>
          <button type="submit" className="btn btn-danger" disabled={deleteText !== 'DELETE'}>
            Delete My Account
          </button>
        </form>
      </div>
    </div>
  )
}
