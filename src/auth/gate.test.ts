import { expect, it } from 'vitest'
import { authGate } from './gate'

it('waits for the session instead of redirecting on reload', () => {
  expect(authGate({ user: null, loading: true })).toBe('wait')
  expect(authGate({ user: null, loading: false })).toBe('redirect')
  expect(authGate({ user: { id: '1' }, loading: false })).toBe('show')
  // A cached user stays visible while the session is re-checked.
  expect(authGate({ user: { id: '1' }, loading: true })).toBe('show')
})

it('goes home, not to sign-up, after signing out or deleting the account', () => {
  expect(authGate({ user: null, loading: false, leaving: true })).toBe('home')
  expect(authGate({ user: { id: '1' }, loading: false, leaving: true })).toBe('show')
  expect(authGate({ user: null, loading: false, leaving: false })).toBe('redirect')
})
