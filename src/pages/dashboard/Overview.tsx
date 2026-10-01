import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { formatDate, getDevices, renewalDate } from '../../auth/account'
import { useAuth } from '../../auth/useAuth'
import { getPlatform } from '../../data/platforms'
import { getPlan } from '../../data/plans'
import { servers } from '../../data/servers'

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

export function Overview() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const plan = getPlan(user?.plan)
  const [serverId, setServerId] = useState(
    () => servers.find((s) => s.id === params.get('server'))?.id ?? servers[0].id,
  )
  const [connectedAt, setConnectedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const server = servers.find((s) => s.id === serverId) ?? servers[0]
  const locked = server.premium && plan?.id !== 'premium'
  const welcome = params.get('welcome') === '1'

  useEffect(() => {
    if (connectedAt === null) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [connectedAt])

  if (!user) return null

  const devices = getDevices(user)
  const lastPayment = user.payments?.[0]

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

  return (
    <>
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
                  <span>Locations</span>
                  <b>{plan.id === 'premium' ? servers.length : servers.filter((s) => !s.premium).length}</b>
                </li>
                <li>
                  <span>{lastPayment && plan.price > 0 ? 'Renews on' : 'Member since'}</span>
                  <b>
                    {lastPayment && plan.price > 0
                      ? formatDate(renewalDate(lastPayment))
                      : new Date(user.memberSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </b>
                </li>
              </ul>
              <Link to="/dashboard/billing" className="btn btn-outline">
                Manage Billing
              </Link>
            </>
          ) : (
            <p>No active plan.</p>
          )}
        </div>

        <div className="card">
          <h2 className="card-title">Devices</h2>
          <p>
            <b>{devices.length}</b> of <b>{plan?.devices ?? 1}</b> devices in use
          </p>
          <ul className="stat-list">
            {devices.slice(0, 3).map((device) => (
              <li key={device.id}>
                <span>
                  {getPlatform(device.platform)?.icon} {device.name}
                </span>
                {device.current && <span className="badge badge-green">This device</span>}
              </li>
            ))}
          </ul>
          <Link to="/dashboard/devices" className="btn btn-outline">
            Manage Devices
          </Link>
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
    </>
  )
}
