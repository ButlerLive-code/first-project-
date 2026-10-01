import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { LocalLink } from '../i18n/LocalLink'
import { useLocalNavigate } from '../i18n/useLocalNavigate'
import { safeNext } from '../auth/next'
import { useAuth } from '../auth/useAuth'

export function Login() {
  const { signIn } = useAuth()
  const navigate = useLocalNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email')).trim()
    const password = String(form.get('password'))
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    signIn(email)
    navigate(next, { replace: true })
  }

  return (
    <section className="auth container">
      <div className="auth-card">
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to manage your plan and connect to LaslesVPN.</p>

        <form className="form" onSubmit={handleSubmit}>
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
              autoComplete="current-password"
              placeholder="••••••••"
              onChange={() => setError('')}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="button" className="link-button" onClick={() => setResetSent(true)}>
            Forgot password?
          </button>
          {resetSent && (
            <p className="form-note">If an account exists, we've sent a reset link to your email.</p>
          )}
          <button type="submit" className="btn btn-primary form-submit">
            Sign In
          </button>
        </form>

        <p className="auth-switch">
          New to LaslesVPN?{' '}
          <LocalLink to={`/signup?next=${encodeURIComponent(next)}`}>Create an account</LocalLink>
        </p>
      </div>
    </section>
  )
}
