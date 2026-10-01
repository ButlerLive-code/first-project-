import { useState } from 'react'
import { LocalLink } from '../i18n/LocalLink'
import { useAuth } from '../auth/useAuth'
import { LanguageSwitcher } from '../i18n/LanguageSwitcher'
import { useT } from '../i18n/useT'
import logo from '../assets/logo.svg'

export function Header() {
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  const t = useT()
  const links = [
    { label: t.header.about, to: '/#about' },
    { label: t.header.features, to: '/#features' },
    { label: t.header.pricing, to: '/#pricing' },
    { label: t.header.testimonials, to: '/#testimonials' },
    { label: t.header.help, to: '/help' },
  ]
  const close = () => setOpen(false)

  return (
    <header className="header container">
      <LocalLink to="/" className="header-logo" onClick={close}>
        <img
          src={logo}
          alt="LaslesVPN" // i18n-ignore
          width={149}
          height={36}
        />
      </LocalLink>

      <button
        type="button"
        className="header-burger"
        aria-label={t.header.menu}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span />
        <span />
        <span />
      </button>

      <div className={`header-menu${open ? ' is-open' : ''}`}>
        <nav>
          <ul className="header-nav">
            {links.map((link) => (
              <li key={link.label}>
                <LocalLink to={link.to} onClick={close}>
                  {link.label}
                </LocalLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="header-auth">
          {user ? (
            <LocalLink to="/dashboard" className="btn header-signup" onClick={close}>
              {t.header.myAccount}
            </LocalLink>
          ) : (
            <>
              <LocalLink to="/login" className="header-signin" onClick={close}>
                {t.header.signIn}
              </LocalLink>
              <LocalLink to="/signup" className="btn header-signup" onClick={close}>
                {t.header.signUp}
              </LocalLink>
            </>
          )}
          <LanguageSwitcher onSwitch={close} />
        </div>
      </div>
    </header>
  )
}
