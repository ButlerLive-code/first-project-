import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth'
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
      <Link to="/" className="header-logo" onClick={close}>
        <img src={logo} alt="LaslesVPN" width={149} height={36} />
      </Link>

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
                <Link to={link.to} onClick={close}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="header-auth">
          {user ? (
            <Link to="/dashboard" className="btn header-signup" onClick={close}>
              My Account
            </Link>
          ) : (
            <>
              <Link to="/login" className="header-signin" onClick={close}>
                Sign In
              </Link>
              <Link to="/signup" className="btn header-signup" onClick={close}>
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
