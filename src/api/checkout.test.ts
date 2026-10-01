import { expect, it } from 'vitest'
import { checkoutBody } from './checkout'

const card = { name: 'Ann', number: '4242 4242 4242 4242', expiry: '12/40', cvc: '123' }

it('sends no card for the free plan', () => {
  expect(checkoutBody('free', 'yearly', card)).toEqual({ plan: 'free' })
})

it('sends plan, billing and card, and never a price', () => {
  const body = checkoutBody('premium', 'yearly', card)
  expect(body).toEqual({ plan: 'premium', billing: 'yearly', card })
  expect(Object.keys(body)).not.toContain('amount')
})
