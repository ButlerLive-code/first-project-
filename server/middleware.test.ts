import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { user } from './db/schema.ts'
import { requireRole, requireUser, type AppEnv } from './middleware.ts'
import { APP_URL, createTestApp, json, type TestApp } from './test/helpers.ts'

let t: TestApp
beforeAll(async () => {
  t = await createTestApp()
})
afterAll(async () => {
  await t.close()
})

// A tiny app behind the guards, the way staff pages will use them.
function staffOnly() {
  return new Hono<AppEnv>().get('/staff', requireUser(t.auth), requireRole('admin', 'support'), (c) =>
    c.json({ role: c.get('user').role }),
  )
}

describe('requireUser', () => {
  it('without a session it is 401 unauthorized', async () => {
    const res = await staffOnly().request('/staff')
    expect(res.status).toBe(401)
    expect(await json(res)).toEqual({ error: { code: 'unauthorized' } })
  })

  it('a banned user is stopped even with a session that is still alive', async () => {
    const cookie = await t.verifiedUser('banned@example.com')
    await t.db.update(user).set({ role: 'admin', banned: true }).where(eq(user.email, 'banned@example.com'))
    const res = await staffOnly().request('/staff', { headers: { cookie } })
    expect(res.status).toBe(403)
    expect(await json(res)).toEqual({ error: { code: 'account_banned' } })
  })
})

describe('requireRole', () => {
  it('turns a customer away with 403 forbidden', async () => {
    const cookie = await t.verifiedUser('cust@example.com')
    const res = await staffOnly().request('/staff', { headers: { cookie } })
    expect(res.status).toBe(403)
    expect(await json(res)).toEqual({ error: { code: 'forbidden' } })
  })

  it('lets a listed role through', async () => {
    const cookie = await t.verifiedUser('staff@example.com')
    await t.db.update(user).set({ role: 'support' }).where(eq(user.email, 'staff@example.com'))
    const res = await staffOnly().request('/staff', { headers: { cookie } })
    expect(res.status).toBe(200)
    expect(await json(res)).toEqual({ role: 'support' })
  })
})

describe('Origin check', () => {
  it('rejects changing requests from another origin or without one', async () => {
    for (const origin of ['https://evil.example', 'http://localhost:5174', null]) {
      const res = await t.call('/api/auth/sign-out', { method: 'POST', origin, body: {} })
      expect(res.status).toBe(403)
      expect(await json(res)).toEqual({ error: { code: 'forbidden' } })
    }
  })

  it('lets the site itself through', async () => {
    const res = await t.call('/api/auth/sign-out', { method: 'POST', origin: APP_URL, body: {} })
    expect(res.status).toBe(200)
  })

  it('lets reads through without an Origin header', async () => {
    const res = await t.call('/api/config', { origin: null })
    expect(res.status).toBe(200)
  })

  it('applies only to changing methods: reads of dev mail and config need no Origin', async () => {
    expect((await t.call('/api/dev/mail', { origin: null })).status).toBe(200)
    expect((await t.call('/api/config', { origin: null })).status).toBe(200)
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const res = await t.call('/api/config', { method, origin: null })
      expect(res.status, method).toBe(403)
    }
  })
})
