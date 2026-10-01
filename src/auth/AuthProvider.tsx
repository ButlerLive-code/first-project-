import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { apiFetch } from '../api/client'
import type { Role } from '../../shared/api'
import { authCall } from './authCall'
import { authClient } from './client'
import { AuthContext, type AuthUser, type AuthValue } from './context'

type SessionUser = NonNullable<ReturnType<typeof authClient.useSession>['data']>['user']

function toAuthUser(user: SessionUser): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    locale: user.locale === 'ru' ? 'ru' : 'en',
    role: (user.role ?? 'customer') as Role,
    twoFactorEnabled: user.twoFactorEnabled === true,
    createdAt: new Date(user.createdAt).toISOString(),
  }
}

// The session lives in an httpOnly cookie set by the API; this provider only
// mirrors it. After sign-in, sign-out and deletion Better Auth refreshes the
// store only after a delayed GET /get-session, so signIn/signUp refetch
// themselves and sign-out/deletion record `leavingFrom` (see RequireAuth).
export function AuthProvider({ children }: { children: ReactNode }) {
  const session = authClient.useSession()
  const { refetch } = session
  // Better Auth flips isPending on every background refetch (window focus), so
  // "loading" means only the very first session check.
  const [ready, setReady] = useState(false)
  if (!session.isPending && !ready) setReady(true)
  const [leavingFrom, setLeavingFrom] = useState<string | null>(null)
  const user = useMemo(() => (session.data ? toAuthUser(session.data.user) : null), [session.data])

  const refresh = useCallback(async () => {
    await refetch()
  }, [refetch])

  const signIn = useCallback<AuthValue['signIn']>(async (email, password) => {
    const data = await authCall(() => authClient.signIn.email({ email, password, fetchOptions: { disableSignal: true } }))
    if ('twoFactorRedirect' in data && data.twoFactorRedirect) return 'two-factor'
    // disableSignal stops Better Auth's delayed session signal, which would cancel
    // this refetch mid-flight. Wait for it so the caller's navigation does not
    // meet a still-empty user.
    await refetch()
    setLeavingFrom(null)
    return 'ok'
  }, [refetch])

  const signUp = useCallback<AuthValue['signUp']>(async ({ name, email, password, locale }) => {
    await authCall(() => authClient.signUp.email({ name, email, password, locale, fetchOptions: { disableSignal: true } }))
    await refetch()
    setLeavingFrom(null)
  }, [refetch])

  const signOut = useCallback(async () => {
    await authCall(() => authClient.signOut())
    setLeavingFrom(window.location.pathname)
  }, [])

  const updateUser = useCallback<AuthValue['updateUser']>(
    async (patch) => {
      await apiFetch('/api/me', { method: 'PATCH', body: patch })
      await refetch()
    },
    [refetch],
  )

  // The session store is emptied by Better Auth a moment later (delayed
  // /get-session); `leavingFrom` keeps RequireAuth from redirecting to /signup meanwhile.
  const deleteAccount = useCallback(async (password: string) => {
    await authCall(() => authClient.deleteUser({ password }))
    setLeavingFrom(window.location.pathname)
  }, [])

  const value = useMemo<AuthValue>(
    () => ({ user, loading: !ready, leavingFrom, signIn, signUp, signOut, updateUser, deleteAccount, refresh }),
    [user, ready, leavingFrom, signIn, signUp, signOut, updateUser, deleteAccount, refresh],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
