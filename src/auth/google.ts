import { localize, type Locale } from '../i18n/locales'

// The sign-in call for Google. Both the way back and the way to the error page
// stay in the language the visitor started from; Better Auth adds ?error=<code>
// to the error page, so a failed round trip never shows its English page.
export function googleSignInRequest(next: string, locale: Locale) {
  return {
    provider: 'google' as const,
    callbackURL: localize(next, locale),
    errorCallbackURL: localize('/login', locale),
  }
}

// Which login-page message a ?error=<code> from the OAuth return gets.
export function googleErrorKey(code: string | null): 'googleCancelled' | 'googleFailed' | null {
  if (!code) return null
  return code === 'access_denied' ? 'googleCancelled' : 'googleFailed'
}

// A user who signed up with Google has no credential (password) account.
export function hasPassword(accounts: readonly { providerId: string }[]) {
  return accounts.some((a) => a.providerId === 'credential')
}
