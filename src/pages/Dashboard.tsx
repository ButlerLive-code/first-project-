import { startTransition, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { getPlan } from '../data/plans'
import { servers } from '../data/servers'

const deviceLimit = { free: 1, standard: 3, premium: 6 }

const quickLinks = [
  { to: '/download', title: 'Download apps', text: 'Get LaslesVPN for every device.' },
  { to: '/tutorials', title: 'Setup guides', text: 'Step-by-step help for each platform.' },
  { to: '/faq', title: 'FAQ', text: 'Answers to the most common questions.' },
  { to: '/help#contact', title: 'Contact support', text: "We're here 24/7 if you get stuck." },
]

function formatDuration(ms: number) {
  const total = Math.floor(ms / 1000)
  const h = String(Math.floor(total / 3600)).padStart(2, '0')
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const s = String(total % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

function fakeIp(serverId: string) {
  let hash = 0
  for (const ch of serverId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return `185.${(hash >> 16) & 255}.${(hash >> 8) & 255}.${hash & 255}`
}

export function Dashboard() {
  const { user, updateUser, signOut } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const plan = getPlan(user?.plan)
  const [serverId, setServerId] = useState(
    () => servers.find((s) => s.id === params.get('server'))?.id ?? servers[0].id,
  )
  const [connectedAt, setConnectedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [saved, setSaved] = useState(false)

  const server = servers.find((s) => s.id === serverId) ?? servers[0]
  const locked = server.premium && plan?.id !== 'premium'
  const welcome = params.get('welcome') === '1'

  useEffect(() => {
    if (connectedAt === null) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [connectedAt])

  if (!user) return null

  function toggleConnection() {
    if (connectedAt !== null) {
      setConnectedAt(null)
      return
    }
    const start = Date.now()
    setNow(start)
    setConnectedAt(start)
  }

  function changeServer(id: string) {
    setServerId(id)
    setConnectedAt(null)
  }

  function handleProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const name = String(new FormData(e.currentTarget).get('name')).trim()
    if (name) {
      updateUser({ name })
      setSaved(true)
    }
  }

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
      {welcome && plan && (
        <div className="toast" role="status">
          <span>
            🎉 You're all set! <b>{plan.name}</b> is now active.
          </span>
          <button type="button" aria-label="Dismiss" onClick={() => setParams({}, { replace: true })}>
            ×
          </button>
        </div>
      )}

      <div className="dashboard-head">
        <div>
          <p className="eyebrow">My Account</p>
          <h1 className="section-title">Hi, {user.name.split(' ')[0]}!</h1>
        </div>
        <button type="button" className="btn btn-outline" onClick={handleSignOut}>
          Sign Out
        </button>
      </div>

      {!plan && (
        <div className="notice">
          <p>
            You don't have an active plan yet. Choose one to start browsing securely.
          </p>
          <Link to="/checkout" className="btn btn-primary">
            Choose a Plan
          </Link>
        </div>
      )}

      <div className="dashboard-grid">
        <div className={`card connect${connectedAt !== null ? ' is-on' : ''}`}>
          <h2 className="card-title">Connection</h2>
          <button
            type="button"
            className="connect-button"
            disabled={!plan || locked}
            onClick={toggleConnection}
            aria-pressed={connectedAt !== null}
          >
            <span className="connect-power" aria-hidden="true">
              ⏻
            </span>
            {connectedAt !== null ? 'Disconnect' : 'Connect'}
          </button>
          <p className="connect-status">
            {connectedAt !== null ? (
              <>
                Protected · {formatDuration(now - connectedAt)}
                <br />
                Your IP: <b>{fakeIp(server.id)}</b>
              </>
            ) : (
              'Not protected'
            )}
          </p>

          <label className="field">
            <span>Server location</span>
            <select value={serverId} onChange={(e) => changeServer(e.target.value)}>
              {servers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.flag} {s.city}, {s.country} — {s.ping} ms{s.premium ? ' · Premium' : ''}
                </option>
              ))}
            </select>
          </label>
          {locked && (
            <p className="form-note">
              This location is available on Premium.{' '}
              <Link to="/checkout?plan=premium">Upgrade</Link>
            </p>
          )}
        </div>

        <div className="card">
          <h2 className="card-title">Your plan</h2>
          {plan ? (
            <>
              <div className="summary-plan">
                <img src={plan.image} alt="" width={72} height={82} />
                <div>
                  <p className="summary-plan-name">{plan.name}</p>
                  <p>{plan.price === 0 ? 'Free forever' : `$${plan.price} / month`}</p>
                </div>
              </div>
              <ul className="stat-list">
                <li>
                  <span>Devices</span>
                  <b>up to {deviceLimit[plan.id]}</b>
                </li>
                <li>
                  <span>Locations</span>
                  <b>{plan.id === 'premium' ? servers.length : servers.filter((s) => !s.premium).length}</b>
                </li>
                <li>
                  <span>Member since</span>
                  <b>{new Date(user.memberSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</b>
                </li>
              </ul>
              <Link to={`/checkout?plan=${plan.id}`} className="btn btn-outline">
                Change Plan
              </Link>
            </>
          ) : (
            <p>No active plan.</p>
          )}
        </div>

        <div className="card">
          <h2 className="card-title">Profile</h2>
          <form className="form" onSubmit={handleProfile}>
            <label className="field">
              <span>Full name</span>
              <input name="name" defaultValue={user.name} required onChange={() => setSaved(false)} />
            </label>
            <label className="field">
              <span>Email</span>
              <input value={user.email} readOnly />
            </label>
            <button type="submit" className="btn btn-outline">
              {saved ? 'Saved ✓' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>

      <h2 className="dashboard-subtitle">Get the most out of LaslesVPN</h2>
      <ul className="quick-links">
        {quickLinks.map((link) => (
          <li key={link.to}>
            <Link to={link.to} className="card quick-link">
              <span className="card-title">{link.title}</span>
              <span>{link.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
