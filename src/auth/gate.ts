// What a protected page does for the current auth state. While the session
// is still loading it must wait: redirecting then would bounce a signed-in
// visitor to the sign-up page on every reload.
export function authGate({ user, loading }: { user: unknown; loading: boolean }): 'wait' | 'redirect' | 'show' {
  if (user) return 'show'
  return loading ? 'wait' : 'redirect'
}
