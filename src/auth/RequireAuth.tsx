import type { ReactNode } from 'react'
import { useLocation } from 'react-router'
import { LocalNavigate } from '../i18n/LocalLink'
import { useT } from '../i18n/useT'
import { authGate, signInRedirect } from './gate'
import { useAuth } from './useAuth'

export function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const location = useLocation()
  const t = useT()

  switch (authGate({ ...auth, pathname: location.pathname })) {
    case 'wait':
      return (
        <p className="container form-note" role="status">
          {t.common.loading}
        </p>
      )
    case 'home':
      return <LocalNavigate to="/" replace />
    case 'redirect':
      return <LocalNavigate to={signInRedirect(location.pathname, location.search)} replace />
    case 'show':
      return children
  }
}
