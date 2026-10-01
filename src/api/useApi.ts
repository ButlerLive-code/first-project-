import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppConfig, Device, Me, Payment } from '../../shared/api'
import { useAuth } from '../auth/useAuth'
import { apiFetch, toApiError } from './client'
import { createRequests, initialState, view, withClear, withData, withError, type LoadState } from './loadState'

// Loads one GET endpoint. `path: null` means "not now" (e.g. signed out) and
// clears the state, so coming back to a path always starts from loading.
// Data from a previous path is never shown for a new one, and a response that
// arrives after a newer request or after setData is discarded.
export function useApi<T>(path: string | null) {
  const [state, setState] = useState<LoadState<T>>(initialState)
  const [version, setVersion] = useState(0)
  const requests = useRef(createRequests())

  useEffect(() => {
    const { begin, invalidate, isCurrent } = requests.current
    if (!path) {
      invalidate()
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when the path goes away
      setState(withClear)
      return
    }
    const token = begin()
    apiFetch<T>(path).then(
      (data) => {
        if (isCurrent(token)) setState((s) => withData(s, path, data))
      },
      (error: unknown) => {
        if (isCurrent(token)) setState((s) => withError(s, path, toApiError(error)))
      },
    )
    return invalidate
  }, [path, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  // Replaces the loaded data after a successful change, without a refetch.
  const setData = useCallback(
    (data: T) => {
      if (!path) return
      requests.current.invalidate()
      setState((s) => withData(s, path, data))
    },
    [path],
  )

  return { ...view(state, path), reload, setData }
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
