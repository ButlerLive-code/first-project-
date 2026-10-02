import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { createTestApp, json, type TestApp } from '../test/helpers.ts'
import { account, device, payment, subscription, user } from './schema.ts'
import { ADMIN_EMAIL, DEMO_EMAIL, seed } from './seed.ts'

let t: TestApp
beforeAll(async () => {
  t = await createTestApp()
})
afterAll(async () => {
  await t.close()
})

it('creates the admin and the demo customer once, with confirmed emails and no mail', async () => {
  expect(await seed(t.db, t.auth, t.config.seed)).toBe(true)
  expect(await seed(t.db, t.auth, t.config.seed)).toBe(false)
  expect(await t.db.select().from(user)).toHaveLength(2)
  expect(await t.mailCount(ADMIN_EMAIL)).toBe(0)

  const admin = await t.signIn(ADMIN_EMAIL, t.config.seed.adminPassword)
  expect(admin.res.status).toBe(200)
  const session = await json<{ user: { role: string; emailVerified: boolean } }>(
    await t.call('/api/auth/get-session', { cookie: admin.cookie }),
  )
  expect(session.user).toMatchObject({ role: 'admin', emailVerified: true })

  const demo = await t.signIn(DEMO_EMAIL, t.config.seed.demoPassword)
  expect(demo.res.status).toBe(200)
  const [demoUser] = await t.db.select().from(user).where(eq(user.email, DEMO_EMAIL))
  expect(demoUser).toMatchObject({ role: 'customer', emailVerified: true })
  const [sub] = await t.db.select().from(subscription).where(eq(subscription.userId, demoUser.id))
  expect(sub).toMatchObject({ plan: 'standard', billing: 'monthly', status: 'active' })
  expect(await t.db.select().from(device).where(eq(device.userId, demoUser.id))).toHaveLength(2)
  const payments = await t.db.select().from(payment).where(eq(payment.userId, demoUser.id))
  expect(payments.map((p) => p.amount)).toEqual([900, 900, 900])
})

it('in production refuses to seed unless both passwords are set explicitly', async () => {
  const env = { NODE_ENV: 'production', BETTER_AUTH_SECRET: 'x'.repeat(32) }
  const prod = await createTestApp({ env })
  try {
    expect(await seed(prod.db, prod.auth, prod.config.seed)).toBe(false)
    expect(await prod.db.select().from(user)).toHaveLength(0)
  } finally {
    await prod.close()
  }

  const half = await createTestApp({ env: { ...env, SEED_ADMIN_PASSWORD: 'a-real-admin-password' } })
  try {
    expect(await seed(half.db, half.auth, half.config.seed)).toBe(false)
    expect(await half.db.select().from(user)).toHaveLength(0)
  } finally {
    await half.close()
  }

  const ok = await createTestApp({
    env: { ...env, SEED_ADMIN_PASSWORD: 'a-real-admin-password', SEED_DEMO_PASSWORD: 'a-real-demo-password' },
  })
  try {
    expect(await seed(ok.db, ok.auth, ok.config.seed)).toBe(true)
    expect(await ok.db.select().from(user)).toHaveLength(2)
  } finally {
    await ok.close()
  }
})

it('completes a partial seed: only the admin exists, then demo data is missing pieces', async () => {
  const p = await createTestApp()
  try {
    // Simulate a crash after the admin: drop everything the demo needs.
    expect(await seed(p.db, p.auth, p.config.seed)).toBe(true)
    await p.db.delete(user).where(eq(user.email, DEMO_EMAIL))
    expect(await seed(p.db, p.auth, p.config.seed)).toBe(true)
    expect(await seed(p.db, p.auth, p.config.seed)).toBe(false)
    const [demo] = await p.db.select().from(user).where(eq(user.email, DEMO_EMAIL))
    expect(await p.db.select().from(subscription).where(eq(subscription.userId, demo.id))).toHaveLength(1)
    expect(await p.db.select().from(device).where(eq(device.userId, demo.id))).toHaveLength(2)
    expect(await p.db.select().from(payment).where(eq(payment.userId, demo.id))).toHaveLength(3)
    expect(await p.db.select().from(account).where(eq(account.userId, demo.id))).toHaveLength(1)

    // Missing devices and payments only.
    await p.db.delete(device).where(eq(device.userId, demo.id))
    await p.db.delete(payment).where(eq(payment.userId, demo.id))
    expect(await seed(p.db, p.auth, p.config.seed)).toBe(true)
    expect(await p.db.select().from(device).where(eq(device.userId, demo.id))).toHaveLength(2)
    expect(await p.db.select().from(payment).where(eq(payment.userId, demo.id))).toHaveLength(3)
    expect(await p.db.select().from(user)).toHaveLength(2)
  } finally {
    await p.close()
  }
})
