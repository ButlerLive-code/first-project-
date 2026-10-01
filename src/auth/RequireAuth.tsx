import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from './useAuth'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    const next = location.pathname + location.search
    return <Navigate to={`/signup?next=${encodeURIComponent(next)}`} replace />
  }
  return children
}
