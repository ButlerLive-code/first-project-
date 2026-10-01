import { expect, it } from 'vitest'
import { googleErrorKey, googleSignInRequest, hasPassword } from './google'

it('sends the browser back to the same language, errors to that language login page', () => {
  expect(googleSignInRequest('/dashboard', 'en')).toEqual({
    provider: 'google',
    callbackURL: '/dashboard',
    errorCallbackURL: '/login',
  })
  expect(googleSignInRequest('/checkout?plan=premium', 'ru')).toEqual({
    provider: 'google',
    callbackURL: '/ru/checkout?plan=premium',
    errorCallbackURL: '/ru/login',
  })
})

it('tells a cancelled Google sign-in from a failed one, and shows nothing without an error', () => {
  expect(googleErrorKey(null)).toBeNull()
  expect(googleErrorKey('')).toBeNull()
  expect(googleErrorKey('access_denied')).toBe('googleCancelled')
  expect(googleErrorKey('account_not_linked')).toBe('googleNotLinked')
  expect(googleErrorKey('state_mismatch')).toBe('googleFailed')
  expect(googleErrorKey('unable_to_link_account')).toBe('googleFailed')
})

it('knows whether an account has a password', () => {
  expect(hasPassword([{ providerId: 'google' }])).toBe(false)
  expect(hasPassword([{ providerId: 'google' }, { providerId: 'credential' }])).toBe(true)
  expect(hasPassword([])).toBe(false)
})
