import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Device, Me, Preferences, Subscription } from '../../shared/api.ts'
import { subscription, user } from '../db/schema.ts'
import { createTestApp, json, type TestApp } from '../test/helpers.ts'

let t: TestApp
beforeAll(async () => {
  t = await createTestApp()
})
afterAll(async () => {
  await t.close()
})

// Puts the user on a paid plan directly; buying one is /api/checkout's job (Task 8).
async function givePlan(email: string, plan: 'standard' | 'premium') {
  const [{ id }] = await t.db.select({ id: user.id }).from(user).where(eq(user.email, email))
  const renewsAt = new Date(Date.now() + 30 * 24 * 3600 * 1000)
  await t.db.insert(subscription).values({ userId: id, plan, billing: 'monthly', renewsAt })
  return id
}

describe('/api/me', () => {
  it('needs a session', async () => {
    const res = await t.call('/api/me')
    expect(res.status).toBe(401)
    expect(await json(res)).toEqual({ error: { code: 'unauthorized' } })
  })

  it('returns the profile, no plan yet and default preferences', async () => {
    const cookie = await t.signUp('me@example.com', { name: 'Mia' })
    const me = await json<Me>(await t.call('/api/me', { cookie }))
    expect(me.user).toMatchObject({ name: 'Mia', email: 'me@example.com', role: 'customer', twoFactorEnabled: false })
    expect(me.subscription).toBeNull()
    expect(me.preferences).toEqual({ autoConnect: false, killSwitch: true, newsletter: false })
  })

  it('PATCH changes the name and the language, and validates both', async () => {
    const cookie = await t.signUp('patch@example.com')
    const me = await json<Me>(await t.call('/api/me', { method: 'PATCH', cookie, body: { name: ' Pat ', locale: 'ru' } }))
    expect(me.user).toMatchObject({ name: 'Pat', locale: 'ru' })
    for (const body of [{ locale: 'de' }, { name: '' }, {}]) {
      const res = await t.call('/api/me', { method: 'PATCH', cookie, body })
      expect(await json(res)).toEqual({ error: { code: 'validation_failed' } })
    }
  })

  it('PATCH /preferences saves only the given switches', async () => {
    const cookie = await t.signUp('prefs@example.com')
    const prefs = await json<Preferences>(
      await t.call('/api/me/preferences', { method: 'PATCH', cookie, body: { autoConnect: true } }),
    )
    expect(prefs).toEqual({ autoConnect: true, killSwitch: true, newsletter: false })
    const again = await json<Preferences>(
      await t.call('/api/me/preferences', { method: 'PATCH', cookie, body: { killSwitch: false } }),
    )
    expect(again).toEqual({ autoConnect: true, killSwitch: false, newsletter: false })
  })
})

describe('/api/me/devices', () => {
  it('allows one device without a plan and answers device_limit after that', async () => {
    const cookie = await t.signUp('dev1@example.com')
    const first = await t.call('/api/me/devices', { method: 'POST', cookie, body: { name: 'Phone', platform: 'ios' } })
    expect(first.status).toBe(201)
    const second = await t.call('/api/me/devices', { method: 'POST', cookie, body: { name: 'Mac', platform: 'macos' } })
    expect(second.status).toBe(409)
    expect(await json(second)).toEqual({ error: { code: 'device_limit' } })
  })

  it('follows the plan limit', async () => {
    const cookie = await t.verifiedUser('dev3@example.com')
    await givePlan('dev3@example.com', 'standard')
    for (const name of ['A', 'B', 'C']) {
      const res = await t.call('/api/me/devices', { method: 'POST', cookie, body: { name, platform: 'linux' } })
      expect(res.status).toBe(201)
    }
    const fourth = await t.call('/api/me/devices', { method: 'POST', cookie, body: { name: 'D', platform: 'linux' } })
    expect(await json(fourth)).toEqual({ error: { code: 'device_limit' } })
    const list = await json<Device[]>(await t.call('/api/me/devices', { cookie }))
    expect(list.map((d) => d.name)).toEqual(['A', 'B', 'C'])
  })

  it("someone else's device is not_found, and stays", async () => {
    const owner = await t.signUp('owner@example.com')
    const other = await t.signUp('other@example.com')
    const created = await json<Device>(
      await t.call('/api/me/devices', { method: 'POST', cookie: owner, body: { name: 'Mine', platform: 'windows' } }),
    )
    const res = await t.call(`/api/me/devices/${created.id}`, { method: 'DELETE', cookie: other })
    expect(res.status).toBe(404)
    expect(await json(res)).toEqual({ error: { code: 'not_found' } })
    expect(await json<Device[]>(await t.call('/api/me/devices', { cookie: other }))).toEqual([])
    expect(await json<Device[]>(await t.call('/api/me/devices', { cookie: owner }))).toHaveLength(1)

    const own = await t.call(`/api/me/devices/${created.id}`, { method: 'DELETE', cookie: owner })
    expect(own.status).toBe(204)
  })

  it('rejects unknown platforms and empty names', async () => {
    const cookie = await t.signUp('badDevice@example.com')
    for (const body of [{ name: 'X', platform: 'symbian' }, { name: '   ', platform: 'ios' }]) {
      const res = await t.call('/api/me/devices', { method: 'POST', cookie, body })
      expect(await json(res)).toEqual({ error: { code: 'validation_failed' } })
    }
  })
})

describe('/api/me/subscription/cancel', () => {
  it('keeps the plan until the period ends, then the account is free', async () => {
    const cookie = await t.verifiedUser('cancel@example.com')
    const id = await givePlan('cancel@example.com', 'premium')

    const res = await t.call('/api/me/subscription/cancel', { method: 'POST', cookie })
    const sub = await json<Subscription>(res)
    expect(sub).toMatchObject({ plan: 'premium', status: 'canceled' })
    expect(sub.renewsAt).not.toBeNull()

    const again = await t.call('/api/me/subscription/cancel', { method: 'POST', cookie })
    expect(await json(again)).toEqual({ error: { code: 'not_found' } })

    await t.db.update(subscription).set({ renewsAt: new Date(Date.now() - 1000) }).where(eq(subscription.userId, id))
    const me = await json<Me>(await t.call('/api/me', { cookie }))
    expect(me.subscription).toMatchObject({ plan: 'free', billing: null, status: 'canceled', renewsAt: null })
  })

  it('there is nothing to cancel without a paid plan', async () => {
    const cookie = await t.signUp('nothing@example.com')
    const res = await t.call('/api/me/subscription/cancel', { method: 'POST', cookie })
    expect(await json(res)).toEqual({ error: { code: 'not_found' } })
  })
})
