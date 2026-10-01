import type { ApiError } from './client'

// The pure state behind useApi, kept apart from React so it can be tested directly.
export interface LoadState<T> {
  path: string | null
  data?: T
  error?: ApiError
}

export function initialState<T>(): LoadState<T> {
  return { path: null }
}

export const withData = <T>(state: LoadState<T>, path: string, data: T): LoadState<T> => ({ ...state, path, data, error: undefined })

export const withError = <T>(state: LoadState<T>, path: string, error: ApiError): LoadState<T> => ({
  ...state,
  path,
  data: undefined,
  error,
})

// Forgets everything, e.g. when the path becomes null (signed out).
export const withClear = <T>(): LoadState<T> => ({ path: null })

// What the page sees for the wanted path. Data stored for another path is never shown.
export function view<T>(state: LoadState<T>, path: string | null) {
  const current: LoadState<T> = state.path === path ? state : { path }
  return {
    data: current.data,
    error: current.error,
    loading: path !== null && current.data === undefined && current.error === undefined,
  }
}

// Tokens for in-flight requests: only the latest request may write its result,
// and a local update (setData) invalidates everything still in flight.
export function createRequests() {
  let latest = 0
  return {
    begin: () => ++latest,
    invalidate: () => {
      latest++
    },
    isCurrent: (token: number) => token === latest,
  }
}
