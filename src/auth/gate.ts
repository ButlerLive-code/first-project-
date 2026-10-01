import { stripLocale } from '../i18n/locales'

// What a protected page does for the current auth state. While the session
// is still loading it must wait: redirecting then would bounce a signed-in
// visitor to the sign-in page on every reload. After signing out or deleting
// the account the visitor goes home from the page they left (`leavingFrom`);
// any other protected page, visited later, redirects as usual (signInRedirect).
export function authGate({
  user,
  loading,
  leavingFrom = null,
  pathname,
}: {
  user: unknown
  loading: boolean
  leavingFrom?: string | null
  pathname?: string
}): 'wait' | 'redirect' | 'home' | 'show' {
  if (user) return 'show'
  if (leavingFrom !== null && leavingFrom === pathname) return 'home'
  return loading ? 'wait' : 'redirect'
}

// Where a signed-out visitor of a protected page goes. A returning user opening
// the dashboard signs in; only the pricing funnel (/checkout) starts at sign-up,
// since whoever picks a plan there usually has no account yet. `next` keeps the
// full path, language prefix included.
export function signInRedirect(pathname: string, search: string) {
  const { path } = stripLocale(pathname)
  const page = path === '/checkout' || path.startsWith('/checkout/') ? '/signup' : '/login'
  return `${page}?next=${encodeURIComponent(pathname + search)}`
}
