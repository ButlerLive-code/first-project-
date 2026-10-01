import { expect, it } from 'vitest'
import { authGate } from './gate'

it('waits for the session instead of redirecting on reload', () => {
  expect(authGate({ user: null, loading: true })).toBe('wait')
  expect(authGate({ user: null, loading: false })).toBe('redirect')
  expect(authGate({ user: { id: '1' }, loading: false })).toBe('show')
  // A cached user stays visible while the session is re-checked.
  expect(authGate({ user: { id: '1' }, loading: true })).toBe('show')
})

it('goes home only on the page the visitor left from', () => {
  const base = { user: null, loading: false, leavingFrom: '/dashboard' }
  expect(authGate({ ...base, pathname: '/dashboard' })).toBe('home')
  // A later visit to another protected page (the pricing buttons go to /checkout) is a normal redirect.
  expect(authGate({ ...base, pathname: '/checkout' })).toBe('redirect')
  expect(authGate({ user: { id: '1' }, loading: false, leavingFrom: '/dashboard', pathname: '/dashboard' })).toBe('show')
  expect(authGate({ user: null, loading: false, leavingFrom: null, pathname: '/dashboard' })).toBe('redirect')
})
