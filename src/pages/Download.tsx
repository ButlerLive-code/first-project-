import { useState } from 'react'
import { LocalLink } from '../i18n/LocalLink'
import { useAuth } from '../auth/useAuth'
import { PageHeader } from '../components/PageHeader'
import { detectPlatform, getPlatforms, type Platform } from '../data/platforms'
import { useLocale } from '../i18n/useLocale'
import { usePageMeta } from '../i18n/usePageMeta'
import { useT } from '../i18n/useT'

const isStore = (p: Platform) => p.id === 'ios' || p.id === 'android'

export function Download() {
  const t = useT()
  const locale = useLocale()
  usePageMeta(t.download.metaTitle)
  const { user } = useAuth()
  const platforms = getPlatforms(locale)
  const [detected] = useState(detectPlatform)
  const [started, setStarted] = useState<Platform | null>(null)
  // Highlight follows the pointer/keyboard focus and falls back to the detected platform.
  const [hovered, setHovered] = useState<string | null>(null)
  const active = hovered ?? detected
  const ordered = [...platforms].sort((a, b) => Number(b.id === detected) - Number(a.id === detected))

  return (
    <>
      <PageHeader eyebrow={t.download.eyebrow} title={t.download.title}>
        {t.download.text}
      </PageHeader>

      <section className="container page-section">
        {started && (
          <div className="toast" role="status">
            <span>
              {isStore(started) ? (
                <>
                  {t.download.storeBefore}
                  <b>{started.file}</b>
                  {t.download.storeAfter}
                </>
              ) : (
                <>
                  {t.download.fileBefore}
                  <b>{started.file}</b>
                  {t.download.fileAfter}
                </>
              )}{' '}
              {t.download.next}{' '}
              <LocalLink to={`/tutorials/${started.id}`}>{t.download.followGuide(started.name)}</LocalLink>
              {user ? (
                <>
                  {' '}
                  {t.download.connectBefore}
                  <LocalLink to="/dashboard">{t.download.dashboardLink}</LocalLink>
                  {t.download.connectAfter}
                </>
              ) : (
                <>
                  {' '}
                  {t.download.signUpBefore}
                  <LocalLink to="/signup?next=%2Fdashboard">{t.download.signUpLink}</LocalLink>
                  {t.download.signUpAfter}
                </>
              )}
            </span>
            <button type="button" aria-label={t.common.dismiss} onClick={() => setStarted(null)}>
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
              {p.id === detected && <span className="badge">{t.download.recommended}</span>}
              <span className="platform-icon" aria-hidden="true">
                {p.icon}
              </span>
              <h2 className="card-title">{p.name}</h2>
              <p className="platform-meta">
                {t.download.version(p.version)} · {p.size}
                <br />
                {p.requirements}
              </p>
              <button
                type="button"
                className={`btn ${p.id === active ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setStarted(p)}
              >
                {isStore(p) ? p.file : t.download.download}
              </button>
              <LocalLink to={`/tutorials/${p.id}`} className="platform-guide">
                {t.download.setupGuide}
              </LocalLink>
            </li>
          ))}
        </ul>

        {!user && (
          <div className="notice page-cta">
            <p>{t.download.needAccount}</p>
            <LocalLink to="/signup?next=%2Fdashboard" className="btn btn-primary">
              {t.download.createFree}
            </LocalLink>
          </div>
        )}
      </section>
    </>
  )
}
