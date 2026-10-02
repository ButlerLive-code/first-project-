import { toApiError } from '../api/client'

// Which failure page a confirmation link gets: only token_expired is
// "expired"; anything else (used, garbled, unknown user) is "invalid".
export function verifyOutcome(error: unknown): 'expired' | 'invalid' {
  return toApiError(error).code === 'token_expired' ? 'expired' : 'invalid'
}

// A link for a new address carries `updateTo` in its JWT payload (the server
// verifies the signature; this only picks the wording).
export function isEmailChangeLink(token: string | null): boolean {
  if (!token) return false
  try {
    const part = (token.split('.')[1] ?? '').replace(/-/g, '+').replace(/_/g, '/')
    const payload: unknown = JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, '=')))
    return typeof payload === 'object' && payload !== null && typeof (payload as { updateTo?: unknown }).updateTo === 'string'
  } catch {
    return false
  }
}

// A new address confirmed anywhere but the browser that asked signs nobody in
// there: the page says so and points to sign-in instead of a dead "success".
export function verifyResult<R extends string>(result: R, token: string | null, signedIn: boolean): R | 'changed' {
  return result === 'success' && !signedIn && isEmailChangeLink(token) ? 'changed' : result
}
