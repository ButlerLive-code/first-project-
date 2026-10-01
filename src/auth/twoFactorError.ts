import { errorMessage } from '../api/errorMessage'
import { toApiError } from '../api/client'
import type { Dictionary } from '../i18n/en'

// The server answers a wrong code with the same `invalid_credentials` as a wrong
// password. Code-entry steps word it for what the person actually typed.
export function loginCodeMessage(t: Dictionary, error: unknown): string {
  const { code } = toApiError(error)
  if (code === 'invalid_credentials') return t.twoFactorLogin.wrongCode
  // The challenge dies after 5 wrong codes and the account can lock for a while.
  if (code === 'rate_limited') return t.twoFactorLogin.lockedOut
  return errorMessage(t, error)
}

export function setupCodeMessage(t: Dictionary, error: unknown): string {
  return toApiError(error).code === 'invalid_credentials' ? t.settings.twoFactor.wrongCode : errorMessage(t, error)
}

export function passwordMessage(t: Dictionary, error: unknown): string {
  return toApiError(error).code === 'invalid_credentials' ? t.settings.twoFactor.wrongPassword : errorMessage(t, error)
}
