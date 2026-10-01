import { useCallback, useEffect, useState } from 'react'
import { authClient } from './client'
import { hasPassword } from './google'

// Whether the signed-in user has a password. A Google-only account has none, so
// the settings cards must not ask for one. 'error' lets the card offer a retry
// instead of guessing.
export function useHasPassword() {
  const [state, setState] = useState<'loading' | 'yes' | 'no' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    authClient
      .listAccounts()
      .then(({ data }) => {
        if (!cancelled) setState(data ? (hasPassword(data) ? 'yes' : 'no') : 'error')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = useCallback(() => {
    setState('loading')
    setAttempt((n) => n + 1)
  }, [])

  return { state, retry }
}
