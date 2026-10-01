import { useCallback, useMemo, type ReactNode } from 'react'
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
// mirrors it. Better Auth refreshes `useSession` after sign-in, sign-out and
// the other auth calls on its own.
export function AuthProvider({ children }: { children: ReactNode }) {
  const session = authClient.useSession()
  const { refetch } = session
  const user = useMemo(() => (session.data ? toAuthUser(session.data.user) : null), [session.data])

  const refresh = useCallback(async () => {
    await refetch()
  }, [refetch])

  const signIn = useCallback<AuthValue['signIn']>(async (email, password) => {
    const data = await authCall(() => authClient.signIn.email({ email, password }))
    return 'twoFactorRedirect' in data && data.twoFactorRedirect ? 'two-factor' : 'ok'
  }, [])

  const signUp = useCallback<AuthValue['signUp']>(async ({ name, email, password, locale }) => {
    await authCall(() => authClient.signUp.email({ name, email, password, locale }))
  }, [])

  const signOut = useCallback(async () => {
    await authCall(() => authClient.signOut())
  }, [])

  const updateUser = useCallback<AuthValue['updateUser']>(
    async (patch) => {
      await apiFetch('/api/me', { method: 'PATCH', body: patch })
      await refetch()
    },
    [refetch],
  )

  // Better Auth re-reads the session by itself after sign-out and deletion.
  const deleteAccount = useCallback(async (password: string) => {
    await authCall(() => authClient.deleteUser({ password }))
  }, [])

  const value = useMemo<AuthValue>(
    () => ({ user, loading: session.isPending, signIn, signUp, signOut, updateUser, deleteAccount, refresh }),
    [user, session.isPending, signIn, signUp, signOut, updateUser, deleteAccount, refresh],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
