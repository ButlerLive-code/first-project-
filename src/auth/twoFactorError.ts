import { errorMessage } from '../api/errorMessage'
import { toApiError } from '../api/client'
import type { Dictionary } from '../i18n/en'

// The server answers a wrong code with the same `invalid_credentials` as a wrong
// password. Code-entry steps word it for what the person actually typed.
export function loginCodeMessage(t: Dictionary, error: unknown): string {
  const { code } = toApiError(error)
  if (code === 'invalid_credentials') return t.twoFactorLogin.wrongCode
  // A plain rate limit (a few requests per 10 seconds) passes quickly; the
  // account lockout after many wrong codes lasts up to 15 minutes. A dead
  // challenge comes back as unauthorized and the page starts over.
  if (code === 'rate_limited') return t.twoFactorLogin.tooFast
  if (code === 'forbidden') return t.twoFactorLogin.lockedOut
  return errorMessage(t, error)
}

export function setupCodeMessage(t: Dictionary, error: unknown): string {
  return toApiError(error).code === 'invalid_credentials' ? t.settings.twoFactor.wrongCode : errorMessage(t, error)
}

export function passwordMessage(t: Dictionary, error: unknown): string {
  return toApiError(error).code === 'invalid_credentials' ? t.settings.twoFactor.wrongPassword : errorMessage(t, error)
}
