// What a protected page does for the current auth state. While the session
// is still loading it must wait: redirecting then would bounce a signed-in
// visitor to the sign-up page on every reload. After signing out or deleting
// the account the visitor goes home from the page they left (`leavingFrom`);
// any other protected page, visited later, redirects to sign-up as usual.
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
