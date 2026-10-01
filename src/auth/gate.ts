// What a protected page does for the current auth state. While the session
// is still loading it must wait: redirecting then would bounce a signed-in
// visitor to the sign-up page on every reload. After signing out or deleting
// the account (`leaving`) the visitor goes home, not to the sign-up page.
export function authGate({
  user,
  loading,
  leaving = false,
}: {
  user: unknown
  loading: boolean
  leaving?: boolean
}): 'wait' | 'redirect' | 'home' | 'show' {
  if (user) return 'show'
  if (leaving) return 'home'
  return loading ? 'wait' : 'redirect'
}
