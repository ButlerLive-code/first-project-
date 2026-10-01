import { useState } from 'react'
import { Outlet } from 'react-router'
import { LocalNavLink } from '../../i18n/LocalLink'
import { useLocalNavigate } from '../../i18n/useLocalNavigate'
import { errorMessage } from '../../api/errorMessage'
import { message, useT, type Message } from '../../i18n/useT'
import { useAuth } from '../../auth/useAuth'

export function DashboardLayout() {
  const { user, signOut } = useAuth()
  const navigate = useLocalNavigate()
  const t = useT()
  const [error, setError] = useState<Message>(null)

  if (!user) return null

  const tabs = [
    { to: '/dashboard', label: t.dashboard.tabs.overview, end: true },
    { to: '/dashboard/devices', label: t.dashboard.tabs.devices },
    { to: '/dashboard/billing', label: t.dashboard.tabs.billing },
    { to: '/dashboard/settings', label: t.dashboard.tabs.settings },
  ]

  async function handleSignOut() {
    setError(null)
    try {
      await signOut()
      // signOut sets `leaving`, so RequireAuth sends us home, not to /signup,
      // if the emptied session lands before this navigation commits.
      navigate('/')
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
    }
  }

  return (
    <section className="dashboard container">
      <div className="dashboard-head">
        <div>
          <p className="eyebrow">{t.dashboard.eyebrow}</p>
          <h1 className="section-title">{t.dashboard.greeting(user.name.split(' ')[0])}</h1>
        </div>
        <button type="button" className="btn btn-outline" onClick={handleSignOut}>
          {t.dashboard.signOut}
        </button>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error(t)}
        </p>
      )}

      <nav className="dashboard-tabs" aria-label={t.dashboard.navLabel}>
        {tabs.map((tab) => (
          <LocalNavLink key={tab.to} to={tab.to} end={tab.end}>
            {tab.label}
          </LocalNavLink>
        ))}
      </nav>

      <Outlet />
    </section>
  )
}
