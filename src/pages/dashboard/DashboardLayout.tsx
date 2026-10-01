import { startTransition } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { useAuth } from '../../auth/useAuth'

const tabs = [
  { to: '/dashboard', label: 'Overview', end: true },
  { to: '/dashboard/devices', label: 'Devices' },
  { to: '/dashboard/billing', label: 'Billing' },
  { to: '/dashboard/settings', label: 'Settings' },
]

export function DashboardLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

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
          <p className="eyebrow">My Account</p>
          <h1 className="section-title">Hi, {user.name.split(' ')[0]}!</h1>
        </div>
        <button type="button" className="btn btn-outline" onClick={handleSignOut}>
          Sign Out
        </button>
      </div>

      <nav className="dashboard-tabs" aria-label="Account sections">
        {tabs.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.end}>
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </section>
  )
}
