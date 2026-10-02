import { expect, it } from 'vitest'
import { ApiError } from '../api/client'
import { en } from '../i18n/en'
import { ru } from '../i18n/ru'
import { deleteAccountMessage } from './deleteError'

it('a Google-only delete with a sign-in older than a day asks to sign in with Google again', () => {
  const stale = new ApiError('unauthorized', 400)
  expect(deleteAccountMessage(en, stale, false)).toBe(en.settings.deleteReauthGoogle)
  expect(en.settings.deleteReauthGoogle).toBe('To delete the account, sign out and sign in with Google again.')
  expect(deleteAccountMessage(ru, stale, false)).toBe(ru.settings.deleteReauthGoogle)
})

it('other errors keep the shared text', () => {
  expect(deleteAccountMessage(en, new ApiError('unauthorized', 401), true)).toBe(en.errors.unauthorized)
  expect(deleteAccountMessage(en, new ApiError('invalid_credentials', 401), true)).toBe(en.errors.invalid_credentials)
  expect(deleteAccountMessage(en, new ApiError('network', 0), false)).toBe(en.errors.network)
})
