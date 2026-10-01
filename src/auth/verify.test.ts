import { expect, it } from 'vitest'
import { ApiError } from '../api/client'
import { isEmailChangeLink, verifyOutcome, verifyResult } from './verify'

it('tells an expired link from a broken one', () => {
  expect(verifyOutcome(new ApiError('token_expired', 401))).toBe('expired')
  expect(verifyOutcome(new ApiError('token_invalid', 401))).toBe('invalid')
  expect(verifyOutcome(new ApiError('network', 0))).toBe('invalid')
  expect(verifyOutcome(new Error('boom'))).toBe('invalid')
})

const jwt = (payload: object) => `e30.${btoa(JSON.stringify(payload)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')}.sig`

it('knows a new-address link from a sign-up link', () => {
  expect(isEmailChangeLink(jwt({ email: 'a@example.com', updateTo: 'b@example.com' }))).toBe(true)
  expect(isEmailChangeLink(jwt({ email: 'a@example.com' }))).toBe(false)
  expect(isEmailChangeLink('garbage')).toBe(false)
  expect(isEmailChangeLink(null)).toBe(false)
})

it('a new address confirmed in a browser that is not signed in asks to sign in with it', () => {
  const change = jwt({ email: 'a@example.com', updateTo: 'b@example.com' })
  expect(verifyResult('success', change, false)).toBe('changed')
  expect(verifyResult('success', change, true)).toBe('success')
  expect(verifyResult('success', jwt({ email: 'a@example.com' }), false)).toBe('success')
  expect(verifyResult('invalid', change, false)).toBe('invalid')
})
