import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { CheckoutResult, Me, Payment } from '../../shared/api.ts'
import { createTestApp, json, type TestApp } from '../test/helpers.ts'

let t: TestApp
beforeAll(async () => {
  t = await createTestApp()
})
afterAll(async () => {
  await t.close()
})

const card = { number: '4242 4242 4242 4242', expiry: '12/40', cvc: '123', name: 'Test' }

function checkout(cookie: string, body: unknown) {
  return t.call('/api/checkout', { method: 'POST', cookie, body })
}

describe('POST /api/checkout', () => {
  it('needs a confirmed email', async () => {
    const cookie = await t.signUp('unverified@example.com')
    const res = await checkout(cookie, { plan: 'standard', billing: 'monthly', card })
    expect(res.status).toBe(403)
    expect(await json(res)).toEqual({ error: { code: 'email_not_verified' } })
  })

  it('charges the server price, whatever the page sends', async () => {
    const cookie = await t.verifiedUser('price@example.com')
    const res = await checkout(cookie, { plan: 'premium', billing: 'yearly', card, amount: 1, price: 0 })
    expect(res.status).toBe(200)
    const result = await json<CheckoutResult>(res)
    expect(result.payment).toMatchObject({ plan: 'premium', billing: 'yearly', amount: 12000, cardBrand: 'Visa', cardLast4: '4242' })
    expect(result.payment?.id).toMatch(/^INV-[0-9A-F]{10}$/)
    expect(result.subscription).toMatchObject({ plan: 'premium', billing: 'yearly', status: 'active' })

    const payments = await json<Payment[]>(await t.call('/api/me/payments', { cookie }))
    expect(payments).toHaveLength(1)
    expect(JSON.stringify(payments)).not.toContain('4242 4242')
  })

  it('always sets a renewal date on a paid subscription', async () => {
    const cookie = await t.verifiedUser('renews@example.com')
    for (const billing of ['monthly', 'yearly'] as const) {
      const result = await json<CheckoutResult>(await checkout(cookie, { plan: 'standard', billing, card }))
      expect(result.subscription.renewsAt).not.toBeNull()
      expect(new Date(result.subscription.renewsAt as string).getTime()).toBeGreaterThan(Date.now())
    }
  })

  it('declines the test card 4000 0000 0000 0002 and records nothing', async () => {
    const cookie = await t.verifiedUser('declined@example.com')
    const res = await checkout(cookie, {
      plan: 'standard',
      billing: 'monthly',
      card: { ...card, number: '4000 0000 0000 0002' },
    })
    expect(res.status).toBe(402)
    expect(await json(res)).toEqual({ error: { code: 'card_declined' } })
    expect(await json(await t.call('/api/me/payments', { cookie }))).toEqual([])
    expect((await json<Me>(await t.call('/api/me', { cookie }))).subscription).toBeNull()
  })

  it('activates the free plan without a card or a payment', async () => {
    const cookie = await t.verifiedUser('free@example.com')
    const result = await json<CheckoutResult>(await checkout(cookie, { plan: 'free' }))
    expect(result).toMatchObject({ payment: null, subscription: { plan: 'free', billing: null, renewsAt: null } })
  })

  it('rejects bad cards and unknown plans with validation_failed', async () => {
    const cookie = await t.verifiedUser('invalid@example.com')
    for (const body of [
      { plan: 'standard', billing: 'monthly', card: { ...card, number: '4242' } },
      { plan: 'standard', billing: 'monthly', card: { ...card, expiry: '01/20' } },
      { plan: 'standard', billing: 'monthly', card: { ...card, cvc: '1' } },
      { plan: 'standard', billing: 'weekly', card },
      { plan: 'platinum', billing: 'monthly', card },
      { plan: 'standard', billing: 'monthly' },
    ]) {
      const res = await checkout(cookie, body)
      expect(res.status).toBe(400)
      expect(await json(res)).toEqual({ error: { code: 'validation_failed' } })
    }
  })
})
