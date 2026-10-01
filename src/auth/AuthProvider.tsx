import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type User } from './context'

// Demo-only auth: the session lives in this browser's localStorage and no
// password is ever stored. Storage can be unavailable (private mode), so every
// access is guarded and the app keeps working with in-memory state.
const SESSION_KEY = 'laslesvpn.session'
const ACCOUNTS_KEY = 'laslesvpn.accounts'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore: the session just won't survive a reload
  }
}

function nameFromEmail(email: string) {
  const local = email.split('@')[0].replace(/[._-]+/g, ' ')
  return local.replace(/\b\w/g, (c) => c.toUpperCase())
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => read<User | null>(SESSION_KEY, null))

  const persist = useCallback((next: User | null) => {
    setUser(next)
    write(SESSION_KEY, next)
    if (next) {
      const accounts = read<Record<string, User>>(ACCOUNTS_KEY, {})
      write(ACCOUNTS_KEY, { ...accounts, [next.email]: next })
    }
  }, [])

  const signIn = useCallback(
    (email: string) => {
      const known = read<Record<string, User>>(ACCOUNTS_KEY, {})[email]
      persist(
        known ?? {
          name: nameFromEmail(email),
          email,
          plan: null,
          memberSince: new Date().toISOString(),
        },
      )
    },
    [persist],
  )

  const signUp = useCallback(
    (name: string, email: string) =>
      persist({ name, email, plan: null, memberSince: new Date().toISOString() }),
    [persist],
  )

  const signOut = useCallback(() => persist(null), [persist])

  const forget = useCallback((email: string) => {
    const accounts = read<Record<string, User>>(ACCOUNTS_KEY, {})
    delete accounts[email]
    write(ACCOUNTS_KEY, accounts)
  }, [])

  const updateUser = useCallback(
    (patch: Partial<User>) => {
      if (!user) return
      const next = { ...user, ...patch }
      // A changed email moves the saved account instead of leaving a copy behind.
      if (next.email !== user.email) forget(user.email)
      persist(next)
    },
    [user, persist, forget],
  )

  const deleteAccount = useCallback(() => {
    if (user) forget(user.email)
    persist(null)
  }, [user, persist, forget])

  const value = useMemo(
    () => ({ user, signIn, signUp, signOut, updateUser, deleteAccount }),
    [user, signIn, signUp, signOut, updateUser, deleteAccount],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
