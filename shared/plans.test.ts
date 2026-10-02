import { expect, it } from 'vitest'
import { deviceLimit, priceCents } from './plans.ts'

it('prices orders in cents with two free months on yearly billing', () => {
  expect(priceCents('standard', 'monthly')).toBe(900)
  expect(priceCents('standard', 'yearly')).toBe(9000)
  expect(priceCents('premium', 'yearly')).toBe(12000)
  expect(priceCents('free', 'monthly')).toBe(0)
})

it('gives accounts without a plan one device', () => {
  expect(deviceLimit(null)).toBe(1)
  expect(deviceLimit('standard')).toBe(3)
  expect(deviceLimit('premium')).toBe(6)
})
