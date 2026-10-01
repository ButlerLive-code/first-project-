import { startTransition } from 'react'
import { Outlet } from 'react-router'
import { LocalNavLink } from '../../i18n/LocalLink'
import { useLocalNavigate } from '../../i18n/useLocalNavigate'
import { useT } from '../../i18n/useT'
import { useAuth } from '../../auth/useAuth'

export function DashboardLayout() {
  const { user, signOut } = useAuth()
  const navigate = useLocalNavigate()
  const t = useT()

  if (!user) return null

  const tabs = [
    { to: '/dashboard', label: t.dashboard.tabs.overview, end: true },
    { to: '/dashboard/devices', label: t.dashboard.tabs.devices },
    { to: '/dashboard/billing', label: t.dashboard.tabs.billing },
    { to: '/dashboard/settings', label: t.dashboard.tabs.settings },
  ]

  function handleSignOut() {
    // The router navigates inside a transition; signing out in the same
    // transition keeps RequireAuth from redirecting to /signup first.
    startTransition(() => {
      navigate('/')
      signOut()
    })
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
