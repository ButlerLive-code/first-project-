import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { formatDate, getDevices, newId } from '../../auth/account'
import type { Device } from '../../auth/context'
import { useAuth } from '../../auth/useAuth'
import { getPlatform, platforms } from '../../data/platforms'
import { getPlan } from '../../data/plans'

export function Devices() {
  const { user, updateUser } = useAuth()
  const [added, setAdded] = useState<Device | null>(null)

  if (!user) return null

  const plan = getPlan(user.plan)
  const limit = plan?.devices ?? 1
  const devices = getDevices(user)
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
    const name = String(data.get('name')).trim() || `My ${getPlatform(platform)?.name}`
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
          <h2 className="card-title">Your devices</h2>
          <p>
            {devices.length} of {limit} in use on {plan ? `the ${plan.name}` : 'a free account'}.
          </p>
        </div>
        <div className="usage" role="img" aria-label={`${devices.length} of ${limit} devices used`}>
          <span style={{ width: `${Math.min(100, (devices.length / limit) * 100)}%` }} />
        </div>
      </div>

      {over && (
        <div className="notice">
          <p>
            Your plan allows {limit} {limit === 1 ? 'device' : 'devices'}. Remove{' '}
            {devices.length - limit} or upgrade to keep them all connected.
          </p>
          <Link to="/checkout?plan=premium" className="btn btn-primary">
            Upgrade
          </Link>
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
                  {device.current && <span className="badge badge-green">This device</span>}
                </p>
                <p className="device-meta">
                  {platform?.name} · added {formatDate(device.addedAt)}
                </p>
              </div>
              {device.current ? (
                <span className="device-meta">Signed in now</span>
              ) : (
                <button type="button" className="btn btn-outline btn-sm" onClick={() => remove(device.id)}>
                  Remove
                </button>
              )}
            </li>
          )
        })}
      </ul>

      <div className="card account-card">
        <h2 className="card-title">Add a device</h2>
        {full ? (
          <p>
            You've used every device slot on your plan. Remove a device above
            {plan?.id !== 'premium' && (
              <>
                {' '}
                or <Link to={`/checkout?plan=${plan ? 'premium' : 'standard'}`} className="text-link">upgrade your plan</Link>
              </>
            )}{' '}
            to add another.
          </p>
        ) : (
          <form className="form device-form" onSubmit={handleAdd}>
            <label className="field">
              <span>Device name</span>
              <input name="name" placeholder="e.g. Work laptop" maxLength={40} />
            </label>
            <label className="field">
              <span>Platform</span>
              <select name="platform" defaultValue={platforms[0].id}>
                {platforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {p.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn btn-primary">
              Add Device
            </button>
          </form>
        )}
        {added && (
          <p className="form-note" role="status">
            <b>{added.name}</b> is added. Next, install the app:{' '}
            <Link to={`/tutorials/${added.platform}`}>{getPlatform(added.platform)?.name} setup guide</Link>
          </p>
        )}
      </div>
    </div>
  )
}
