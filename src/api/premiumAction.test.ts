import { expect, it } from 'vitest'
import { premiumAction } from './premiumAction'

const me = (plan: 'free' | 'premium' | null) => ({
  data: { subscription: plan ? { plan } : null },
  error: undefined,
})

it('lets anonymous users connect', () => {
  expect(premiumAction(false, { data: undefined, error: undefined })).toBe('connect')
})
it('waits while the plan loads', () => {
  expect(premiumAction(true, { data: undefined, error: undefined })).toBe('pending')
})
it('does not claim an upgrade when the plan request failed', () => {
  expect(premiumAction(true, { data: undefined, error: new Error('x') })).toBe('connect')
})
it('connects premium and offers upgrade to others', () => {
  expect(premiumAction(true, me('premium'))).toBe('connect')
  expect(premiumAction(true, me('free'))).toBe('upgrade')
  expect(premiumAction(true, me(null))).toBe('upgrade')
})
