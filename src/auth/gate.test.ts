import { expect, it } from 'vitest'
import { authGate, signInRedirect } from './gate'

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

it('sends a returning visitor of a protected page to sign in, keeping where they were going', () => {
  expect(signInRedirect('/dashboard', '')).toBe('/login?next=%2Fdashboard')
  expect(signInRedirect('/dashboard/settings', '?tab=1')).toBe('/login?next=%2Fdashboard%2Fsettings%3Ftab%3D1')
  // The language prefix does not change the decision; `next` keeps it.
  expect(signInRedirect('/ru/dashboard', '')).toBe('/login?next=%2Fru%2Fdashboard')
  expect(signInRedirect('/ru/dashboard/billing', '')).toBe('/login?next=%2Fru%2Fdashboard%2Fbilling')
})

it('only the pricing funnel (/checkout) goes to sign-up', () => {
  expect(signInRedirect('/checkout', '?plan=standard')).toBe('/signup?next=%2Fcheckout%3Fplan%3Dstandard')
  expect(signInRedirect('/ru/checkout', '')).toBe('/signup?next=%2Fru%2Fcheckout')
  // A page that merely starts with the word is not the funnel.
  expect(signInRedirect('/checkouts', '')).toBe('/login?next=%2Fcheckouts')
})
