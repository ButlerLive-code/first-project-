import { useAuth } from './useAuth'

// Where a "Connect to this server" action should lead: straight to the
// dashboard with the server preselected, or through sign-up first.
export function useConnectHref() {
  const { user } = useAuth()
  return (serverId: string) => {
    const target = `/dashboard?server=${serverId}`
    return user ? target : `/signup?next=${encodeURIComponent(target)}`
  }
}
