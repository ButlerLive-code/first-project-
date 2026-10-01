import { useState, type FormEvent } from 'react'
import type { Device } from '../../../shared/api'
import { deviceLimit } from '../../../shared/plans'
import { ApiState } from '../../api/ApiState'
import { apiFetch } from '../../api/client'
import { errorMessage } from '../../api/errorMessage'
import { useDevices, useMe } from '../../api/useApi'
import { LocalLink } from '../../i18n/LocalLink'
import { formatDate } from '../../auth/account'
import { getPlatform, getPlatforms } from '../../data/platforms'
import { useLocale } from '../../i18n/useLocale'
import { usePageMeta } from '../../i18n/usePageMeta'
import { message, useT, type Message } from '../../i18n/useT'
import { getPlan } from '../../data/plans'

export function Devices() {
  const me = useMe()
  const devicesState = useDevices()
  const t = useT()
  const locale = useLocale()
  const platforms = getPlatforms(locale)
  usePageMeta(t.devices.metaTitle)
  const [added, setAdded] = useState<Device | null>(null)
  const [error, setError] = useState<Message>(null)
  const [busy, setBusy] = useState(false)

  if (!me.data || !devicesState.data) {
    return (
      <ApiState
        error={me.error ?? devicesState.error}
        onRetry={() => {
          me.reload()
          devicesState.reload()
        }}
      />
    )
  }

  const plan = getPlan(me.data.subscription?.plan)
  const limit = deviceLimit(plan?.id)
  const devices = devicesState.data
  const full = devices.length >= limit
  const over = devices.length > limit

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const platform = String(data.get('platform'))
    const name = String(data.get('name')).trim() || t.devices.defaultName(getPlatform(platform, locale)?.name)
    setBusy(true)
    setError(null)
    try {
      const device = await apiFetch<Device>('/api/me/devices', { method: 'POST', body: { name, platform } })
      devicesState.setData([...devices, device])
      setAdded(device)
      form.reset()
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    setError(null)
    try {
      await apiFetch(`/api/me/devices/${encodeURIComponent(id)}`, { method: 'DELETE' })
      devicesState.setData(devices.filter((device) => device.id !== id))
      if (added?.id === id) setAdded(null)
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
    }
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

      {error && (
        <p className="form-error" role="alert">
          {error(t)}
        </p>
      )}

      <ul className="device-list">
        {devices.map((device) => {
          const platform = getPlatform(device.platform, locale)
          return (
            <li key={device.id} className="card device">
              <span className="device-icon" aria-hidden="true">
                {platform?.icon}
              </span>
              <div className="device-info">
                <p className="device-name">{device.name}</p>
                <p className="device-meta">
                  {t.devices.meta(platform?.name ?? '', formatDate(device.createdAt, locale))}
                </p>
              </div>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => remove(device.id)}>
                {t.devices.remove}
              </button>
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
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {t.devices.addDevice}
            </button>
          </form>
        )}
        {added && (
          <p className="form-note" role="status">
            <b>{added.name}</b>
            {t.devices.addedAfter}
            <LocalLink to={`/tutorials/${added.platform}`}>{t.devices.setupGuide(getPlatform(added.platform, locale)?.name ?? '')}</LocalLink>
          </p>
        )}
      </div>
    </div>
  )
}
