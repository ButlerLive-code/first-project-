import { ApiError, errorFromBody } from '../api/client'

// Better Auth client calls resolve to { data, error }. Our server rewrites
// every auth error body to { error: { code } }, which better-fetch spreads
// into `error` next to `status`.
type AuthResult<T> = { data: T; error: null } | { data: null; error: { status: number } }

export async function authCall<T>(call: () => Promise<AuthResult<T>>): Promise<NonNullable<T>> {
  let result: AuthResult<T>
  try {
    result = await call()
  } catch {
    throw new ApiError('network', 0)
  }
  if (result.error) {
    // better-fetch reports a failed connection as a 500 with statusText "Fetch Error".
    if ((result.error as { statusText?: string }).statusText === 'Fetch Error') throw new ApiError('network', 0)
    throw errorFromBody(result.error.status, result.error)
  }
  // Every endpoint we call answers a success with a body.
  if (result.data === null || result.data === undefined) throw new ApiError('server_error', 0)
  return result.data
}
