import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { LocalLink } from '../../i18n/LocalLink'
import { formatDate, getDevices, renewalDate } from '../../auth/account'
import { useAuth } from '../../auth/useAuth'
import { getPlatform } from '../../data/platforms'
import { formatMonthYear, formatPrice } from '../../i18n/format'
import { useLocale } from '../../i18n/useLocale'
import { usePageMeta } from '../../i18n/usePageMeta'
import { useT } from '../../i18n/useT'
import { getPlan } from '../../data/plans'
import { placeName, servers } from '../../data/servers'

// Links in the same order as t.overview.quickLinks.
const quickLinkTargets = ['/download', '/tutorials', '/faq', '/help#contact']

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
  const t = useT()
  const locale = useLocale()
  usePageMeta(t.overview.metaTitle)
  const [params, setParams] = useSearchParams()
  const plan = getPlan(user?.plan)
  const [serverId, setServerId] = useState(
    () => servers.find((s) => s.id === params.get('server'))?.id ?? servers[0].id,
  )
  const [connectedAt, setConnectedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const limit = plan?.devices ?? 1
  const [before, between, after] = t.overview.devicesInUse(limit)

  const server = servers.find((s) => s.id === serverId) ?? servers[0]
  const locked = server.premium && plan?.id !== 'premium'
  const welcome = params.get('welcome') === '1'

  useEffect(() => {
    if (connectedAt === null) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [connectedAt])

  if (!user) return null

  const devices = getDevices(user, t.devices.defaultName)
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
            {t.overview.welcomeBefore}
            <b>{t.plans[plan.id].name}</b>
            {t.overview.welcomeAfter}
          </span>
          <button type="button" aria-label={t.common.dismiss} onClick={() => setParams({}, { replace: true })}>
            ×
          </button>
        </div>
      )}

      {!plan && (
        <div className="notice">
          <p>{t.overview.noPlan}</p>
          <LocalLink to="/checkout" className="btn btn-primary">
            {t.common.choosePlan}
          </LocalLink>
        </div>
      )}

      <div className="dashboard-grid">
        <div className={`card connect${connectedAt !== null ? ' is-on' : ''}`}>
          <h2 className="card-title">{t.overview.connection}</h2>
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
            {connectedAt !== null ? t.overview.disconnect : t.overview.connect}
          </button>
          <p className="connect-status">
            {connectedAt !== null ? (
              <>
                {t.overview.protected} · {formatDuration(now - connectedAt)}
                <br />
                {t.overview.yourIp} <b>{fakeIp(server.id)}</b>
              </>
            ) : (
              t.overview.notProtected
            )}
          </p>

          <label className="field">
            <span>{t.overview.serverLocation}</span>
            <select value={serverId} onChange={(e) => changeServer(e.target.value)}>
              {servers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.flag} {placeName(s.city, locale)}, {placeName(s.country, locale)} — {s.ping} {t.overview.ms}
                  {s.premium ? ` · ${t.overview.premium}` : ''}
                </option>
              ))}
            </select>
          </label>
          {locked && (
            <p className="form-note">
              {t.overview.lockedBefore}
              <LocalLink to="/checkout?plan=premium">{t.common.upgrade}</LocalLink>
            </p>
          )}
        </div>

        <div className="card">
          <h2 className="card-title">{t.overview.yourPlan}</h2>
          {plan ? (
            <>
              <div className="summary-plan">
                <img src={plan.image} alt="" width={72} height={82} />
                <div>
                  <p className="summary-plan-name">{t.plans[plan.id].name}</p>
                  <p>{plan.price === 0
                      ? t.checkout.freeForever
                      : t.common.pricePerMonth(formatPrice(plan.price, locale))}</p>
                </div>
              </div>
              <ul className="stat-list">
                <li>
                  <span>{t.overview.locations}</span>
                  <b>{plan.id === 'premium' ? servers.length : servers.filter((s) => !s.premium).length}</b>
                </li>
                <li>
                  <span>{lastPayment && plan.price > 0 ? t.overview.renewsOn : t.overview.memberSince}</span>
                  <b>
                    {lastPayment && plan.price > 0
                      ? formatDate(renewalDate(lastPayment), locale)
                      : formatMonthYear(user.memberSince, locale)}
                  </b>
                </li>
              </ul>
              <LocalLink to="/dashboard/billing" className="btn btn-outline">
                {t.overview.manageBilling}
              </LocalLink>
            </>
          ) : (
            <p>{t.overview.noActivePlan}</p>
          )}
        </div>

        <div className="card">
          <h2 className="card-title">{t.dashboard.tabs.devices}</h2>
          <p>
            {before}
            <b>{devices.length}</b>
            {between}
            <b>{limit}</b>
            {after}
          </p>
          <ul className="stat-list">
            {devices.slice(0, 3).map((device) => (
              <li key={device.id}>
                <span>
                  {getPlatform(device.platform, locale)?.icon} {device.name}
                </span>
                {device.current && <span className="badge badge-green">{t.common.thisDevice}</span>}
              </li>
            ))}
          </ul>
          <LocalLink to="/dashboard/devices" className="btn btn-outline">
            {t.overview.manageDevices}
          </LocalLink>
        </div>
      </div>

      <h2 className="dashboard-subtitle">{t.overview.getMost}</h2>
      <ul className="quick-links">
        {t.overview.quickLinks.map((link, i) => (
          <li key={quickLinkTargets[i]}>
            <LocalLink to={quickLinkTargets[i]} className="card quick-link">
              <span className="card-title">{link.title}</span>
              <span>{link.text}</span>
            </LocalLink>
          </li>
        ))}
      </ul>
    </>
  )
}
