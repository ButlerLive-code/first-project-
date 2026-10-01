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

it('lockouts on the second step say to sign in again', () => {
  expect(loginCodeMessage(en, new ApiError('rate_limited', 429))).toBe(en.twoFactorLogin.lockedOut)
})

it('other errors keep the shared text', () => {
  expect(loginCodeMessage(en, new ApiError('network', 0))).toBe(en.errors.network)
})
