import { expect, it } from 'vitest'
import { ApiError } from '../api/client'
import { en } from '../i18n/en'
import { loginCodeMessage, passwordMessage, setupCodeMessage } from './twoFactorError'

const bad = new ApiError('invalid_credentials', 401)

it('a wrong code is not called a wrong password', () => {
  expect(loginCodeMessage(en, bad)).toBe(en.twoFactorLogin.wrongCode)
  expect(setupCodeMessage(en, bad)).toBe(en.settings.twoFactor.wrongCode)
  expect(passwordMessage(en, bad)).toBe(en.settings.twoFactor.wrongPassword)
})

it('a short rate limit on the second step says to wait a few seconds', () => {
  expect(loginCodeMessage(en, new ApiError('rate_limited', 429))).toBe(en.twoFactorLogin.tooFast)
  expect(en.twoFactorLogin.tooFast).toBe('Too many attempts. Wait a few seconds and try again.')
})

it('the account lockout says it lasts up to 15 minutes', () => {
  expect(loginCodeMessage(en, new ApiError('forbidden', 429))).toBe(en.twoFactorLogin.lockedOut)
  expect(en.twoFactorLogin.lockedOut).toMatch(/15 minutes/)
})

it('other errors keep the shared text', () => {
  expect(loginCodeMessage(en, new ApiError('network', 0))).toBe(en.errors.network)
})
