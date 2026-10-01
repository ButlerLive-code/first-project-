import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { LocalLink } from '../i18n/LocalLink'
import { useLocalNavigate } from '../i18n/useLocalNavigate'
import { safeNext } from '../auth/next'
import { useAuth } from '../auth/useAuth'

export function Signup() {
  const { signUp } = useAuth()
  const navigate = useLocalNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'), '/checkout')
  const [error, setError] = useState('')

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const name = String(form.get('name')).trim()
    const email = String(form.get('email')).trim()
    const password = String(form.get('password'))
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    signUp(name, email)
    navigate(next, { replace: true })
  }

  return (
    <section className="auth container">
      <div className="auth-card">
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Join 90+ users who browse safely with LaslesVPN.</p>

        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Full name</span>
            <input name="name" required autoComplete="name" placeholder="Viezh Robert" />
          </label>
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="new-password"
              placeholder="At least 6 characters"
              onChange={() => setError('')}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <label className="checkbox">
            <input type="checkbox" required />
            <span>
              I agree to the <LocalLink to="/terms">Terms of Service</LocalLink> and{' '}
              <LocalLink to="/privacy">Privacy Policy</LocalLink>
            </span>
          </label>
          <button type="submit" className="btn btn-primary form-submit">
            Sign Up
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <LocalLink to={`/login?next=${encodeURIComponent(next)}`}>Sign in</LocalLink>
        </p>
      </div>
    </section>
  )
}
