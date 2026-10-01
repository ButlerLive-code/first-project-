import { toApiError } from '../api/client'

// Which failure page a confirmation link gets: only token_expired is
// "expired"; anything else (used, garbled, unknown user) is "invalid".
export function verifyOutcome(error: unknown): 'expired' | 'invalid' {
  return toApiError(error).code === 'token_expired' ? 'expired' : 'invalid'
}
