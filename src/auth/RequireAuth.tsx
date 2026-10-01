import type { ReactNode } from 'react'
import { useLocation } from 'react-router'
import { LocalNavigate } from '../i18n/LocalLink'
import { useAuth } from './useAuth'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    const next = location.pathname + location.search
    return <LocalNavigate to={`/signup?next=${encodeURIComponent(next)}`} replace />
  }
  return children
}
