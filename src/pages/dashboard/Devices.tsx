import { useState, type FormEvent } from 'react'
import { LocalLink } from '../../i18n/LocalLink'
import { formatDate, getDevices, newId } from '../../auth/account'
import type { Device } from '../../auth/context'
import { useAuth } from '../../auth/useAuth'
import { getPlatform, platforms } from '../../data/platforms'
import { useLocale } from '../../i18n/useLocale'
import { usePageMeta } from '../../i18n/usePageMeta'
import { useT } from '../../i18n/useT'
import { getPlan } from '../../data/plans'

export function Devices() {
  const { user, updateUser } = useAuth()
  const t = useT()
  const locale = useLocale()
  usePageMeta(t.devices.metaTitle)
  const [added, setAdded] = useState<Device | null>(null)

  if (!user) return null

  const plan = getPlan(user.plan)
  const limit = plan?.devices ?? 1
  const devices = getDevices(user, t.devices.defaultName)
  const full = devices.length >= limit
  const over = devices.length > limit

  function save(next: Device[]) {
    updateUser({ devices: next })
  }

  function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const platform = String(data.get('platform'))
    const name = String(data.get('name')).trim() || t.devices.defaultName(getPlatform(platform)?.name)
    const device = { id: newId('DEV'), name, platform, addedAt: new Date().toISOString() }
    save([...devices, device])
    setAdded(device)
    form.reset()
  }

  function remove(id: string) {
    save(devices.filter((device) => device.id !== id))
    if (added?.id === id) setAdded(null)
  }

  return (
    <div className="account-section">
      <div className="account-section-head">
        <div>
          <h2 className="card-title">{t.devices.title}</h2>
          <p>
            {plan
              ? t.devices.usageOnPlan(devices.length, limit, t.plans[plan.id].name)
              : t.devices.usageFree(devices.length, limit)}
          </p>
        </div>
        <div className="usage" role="img" aria-label={t.devices.usageLabel(devices.length, limit)}>
          <span style={{ width: `${Math.min(100, (devices.length / limit) * 100)}%` }} />
        </div>
      </div>

      {over && (
        <div className="notice">
          <p>{t.devices.overLimit(limit, devices.length - limit)}</p>
          <LocalLink to="/checkout?plan=premium" className="btn btn-primary">
            {t.common.upgrade}
          </LocalLink>
        </div>
      )}

      <ul className="device-list">
        {devices.map((device) => {
          const platform = getPlatform(device.platform)
          return (
            <li key={device.id} className="card device">
              <span className="device-icon" aria-hidden="true">
                {platform?.icon}
              </span>
              <div className="device-info">
                <p className="device-name">
                  {device.name}
                  {device.current && <span className="badge badge-green">{t.common.thisDevice}</span>}
                </p>
                <p className="device-meta">
                  {t.devices.meta(platform?.name ?? '', formatDate(device.addedAt, locale))}
                </p>
              </div>
              {device.current ? (
                <span className="device-meta">{t.devices.signedInNow}</span>
              ) : (
                <button type="button" className="btn btn-outline btn-sm" onClick={() => remove(device.id)}>
                  {t.devices.remove}
                </button>
              )}
            </li>
          )
        })}
      </ul>

      <div className="card account-card">
        <h2 className="card-title">{t.devices.addTitle}</h2>
        {full ? (
          <p>
            {t.devices.fullBefore}
            {plan?.id !== 'premium' && (
              <>
                {t.devices.fullOr}
                <LocalLink to={`/checkout?plan=${plan ? 'premium' : 'standard'}`} className="text-link">
                  {t.devices.fullUpgrade}
                </LocalLink>
              </>
            )}
            {t.devices.fullAfter}
          </p>
        ) : (
          <form className="form device-form" onSubmit={handleAdd}>
            <label className="field">
              <span>{t.devices.deviceName}</span>
              <input name="name" placeholder={t.devices.namePlaceholder} maxLength={40} />
            </label>
            <label className="field">
              <span>{t.devices.platform}</span>
              <select name="platform" defaultValue={platforms[0].id}>
                {platforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {p.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn btn-primary">
              {t.devices.addDevice}
            </button>
          </form>
        )}
        {added && (
          <p className="form-note" role="status">
            <b>{added.name}</b>
            {t.devices.addedAfter}
            <LocalLink to={`/tutorials/${added.platform}`}>{t.devices.setupGuide(getPlatform(added.platform)?.name ?? '')}</LocalLink>
          </p>
        )}
      </div>
    </div>
  )
}
