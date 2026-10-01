import { expect, it } from 'vitest'
import { ApiError } from '../api/client'
import { verifyOutcome } from './verify'

it('tells an expired link from a broken one', () => {
  expect(verifyOutcome(new ApiError('token_expired', 401))).toBe('expired')
  expect(verifyOutcome(new ApiError('token_invalid', 401))).toBe('invalid')
  expect(verifyOutcome(new ApiError('network', 0))).toBe('invalid')
  expect(verifyOutcome(new Error('boom'))).toBe('invalid')
})
