// What a premium server row offers. 'pending' while a signed-in user's plan is
// still loading; a failed plan request falls back to 'connect' (the dashboard
// shows the error) rather than claiming an upgrade is needed.
export function premiumAction(
  signedIn: boolean,
  me: { data?: { subscription: { plan: string } | null }; error?: unknown },
): 'connect' | 'upgrade' | 'pending' {
  if (!signedIn) return 'connect'
  if (me.data) return me.data.subscription?.plan === 'premium' ? 'connect' : 'upgrade'
  return me.error ? 'connect' : 'pending'
}
