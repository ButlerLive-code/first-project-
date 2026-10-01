import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { PageHeader } from '../components/PageHeader'
import { detectPlatform, platforms, type Platform } from '../data/platforms'

const isStore = (p: Platform) => p.id === 'ios' || p.id === 'android'

export function Download() {
  const { user } = useAuth()
  const [detected] = useState(detectPlatform)
  const [started, setStarted] = useState<Platform | null>(null)
  // Highlight follows the pointer/keyboard focus and falls back to the detected platform.
  const [hovered, setHovered] = useState<string | null>(null)
  const active = hovered ?? detected
  const ordered = [...platforms].sort((a, b) => Number(b.id === detected) - Number(a.id === detected))

  return (
    <>
      <PageHeader eyebrow="Download" title="Get LaslesVPN on every device">
        One account protects up to 6 devices. Pick your platform and you'll be connected in under
        a minute.
      </PageHeader>

      <section className="container page-section">
        {started && (
          <div className="toast" role="status">
            <span>
              {isStore(started) ? (
                <>
                  Opening <b>{started.file}</b> (demo) — search for “LaslesVPN” to install.
                </>
              ) : (
                <>
                  Your download of <b>{started.file}</b> would start now (demo).
                </>
              )}{' '}
              Next: <Link to={`/tutorials/${started.id}`}>follow the {started.name} setup guide</Link>
              {user ? (
                <>
                  {' '}
                  and connect from <Link to="/dashboard">your dashboard</Link>.
                </>
              ) : (
                <>
                  {' '}
                  and <Link to="/signup?next=%2Fdashboard">create your free account</Link> to sign
                  in.
                </>
              )}
            </span>
            <button type="button" aria-label="Dismiss" onClick={() => setStarted(null)}>
              ×
            </button>
          </div>
        )}

        <ul
          className="platform-grid"
          onMouseLeave={() => setHovered(null)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setHovered(null)
          }}
        >
          {ordered.map((p) => (
            <li
              key={p.id}
              className={`card platform${p.id === active ? ' is-active' : ''}`}
              onMouseEnter={() => setHovered(p.id)}
              onFocus={() => setHovered(p.id)}
            >
              {p.id === detected && <span className="badge">Recommended for you</span>}
              <span className="platform-icon" aria-hidden="true">
                {p.icon}
              </span>
              <h2 className="card-title">{p.name}</h2>
              <p className="platform-meta">
                Version {p.version} · {p.size}
                <br />
                {p.requirements}
              </p>
              <button
                type="button"
                className={`btn ${p.id === active ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setStarted(p)}
              >
                {isStore(p) ? p.file : 'Download'}
              </button>
              <Link to={`/tutorials/${p.id}`} className="platform-guide">
                Setup guide →
              </Link>
            </li>
          ))}
        </ul>

        {!user && (
          <div className="notice page-cta">
            <p>You'll need a LaslesVPN account to sign in to the app — it's free to start.</p>
            <Link to="/signup?next=%2Fdashboard" className="btn btn-primary">
              Create Free Account
            </Link>
          </div>
        )}
      </section>
    </>
  )
}
