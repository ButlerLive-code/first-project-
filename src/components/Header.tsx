import { useState } from 'react'
import { LocalLink } from '../i18n/LocalLink'
import { useAuth } from '../auth/useAuth'
import { LanguageSwitcher } from '../i18n/LanguageSwitcher'
import logo from '../assets/logo.svg'

const links = [
  { label: 'About', to: '/#about' },
  { label: 'Features', to: '/#features' },
  { label: 'Pricing', to: '/#pricing' },
  { label: 'Testimonials', to: '/#testimonials' },
  { label: 'Help', to: '/help' },
]

export function Header() {
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  const close = () => setOpen(false)

  return (
    <header className="header container">
      <LocalLink to="/" className="header-logo" onClick={close}>
        <img src={logo} alt="LaslesVPN" width={149} height={36} />
      </LocalLink>

      <button
        type="button"
        className="header-burger"
        aria-label="Menu"
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
          <LanguageSwitcher onSwitch={close} />
          {user ? (
            <LocalLink to="/dashboard" className="btn header-signup" onClick={close}>
              My Account
            </LocalLink>
          ) : (
            <>
              <LocalLink to="/login" className="header-signin" onClick={close}>
                Sign In
              </LocalLink>
              <LocalLink to="/signup" className="btn header-signup" onClick={close}>
                Sign Up
              </LocalLink>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
