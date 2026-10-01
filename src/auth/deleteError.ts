import { errorMessage } from '../api/errorMessage'
import { toApiError } from '../api/client'
import type { Dictionary } from '../i18n/en'

// A Google-only account confirms a deletion with a recent sign-in. When that
// sign-in is older than a day the server answers `unauthorized` (Better Auth's
// SESSION_EXPIRED) while the user is still signed in, so the shared "session
// has ended" text would be wrong: say what to do instead.
export function deleteAccountMessage(t: Dictionary, error: unknown, hasPassword: boolean): string {
  if (!hasPassword && toApiError(error).code === 'unauthorized') return t.settings.deleteReauthGoogle
  return errorMessage(t, error)
}
