import { useCallback, useEffect, useState } from 'react'
import type { AppConfig, Device, Me, Payment } from '../../shared/api'
import { useAuth } from '../auth/useAuth'
import { apiFetch, toApiError, type ApiError } from './client'

interface State<T> {
  path: string | null
  data?: T
  error?: ApiError
}

// Loads one GET endpoint. `path: null` means "not now" (e.g. signed out).
// Data from a previous path is never shown for a new one.
export function useApi<T>(path: string | null) {
  const [state, setState] = useState<State<T>>({ path: null })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!path) return
    let alive = true
    apiFetch<T>(path).then(
      (data) => {
        if (alive) setState({ path, data })
      },
      (error: unknown) => {
        if (alive) setState({ path, error: toApiError(error) })
      },
    )
    return () => {
      alive = false
    }
  }, [path, version])

  const current: State<T> = state.path === path ? state : { path }
  const reload = useCallback(() => setVersion((v) => v + 1), [])
  // Replaces the loaded data after a successful change, without a refetch.
  const setData = useCallback((data: T) => setState({ path, data }), [path])

  return {
    data: current.data,
    error: current.error,
    loading: path !== null && current.data === undefined && current.error === undefined,
    reload,
    setData,
  }
}

export function useMe() {
  const { user } = useAuth()
  return useApi<Me>(user ? '/api/me' : null)
}

export function useDevices() {
  const { user } = useAuth()
  return useApi<Device[]>(user ? '/api/me/devices' : null)
}

export function usePayments() {
  const { user } = useAuth()
  return useApi<Payment[]>(user ? '/api/me/payments' : null)
}

export function useConfig() {
  return useApi<AppConfig>('/api/config')
}
