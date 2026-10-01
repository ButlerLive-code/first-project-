import { randomUUID } from 'node:crypto'
import { and, count, desc, eq, gt } from 'drizzle-orm'
import { Hono } from 'hono'
import * as z from 'zod'
import { locales, platformIds, type Me, type SessionInfo } from '../../shared/api.ts'
import { deviceLimit } from '../../shared/plans.ts'
import type { Auth } from '../auth.ts'
import type { Db } from '../db/client.ts'
import { device, payment, preferences, session, subscription, user } from '../db/schema.ts'
import { AppError, readBody } from '../errors.ts'
import { requireUser, type AppEnv } from '../middleware.ts'
import { defaultPreferences, toDevice, toPayment, toPreferences, toProfile, toSubscription } from './serialize.ts'

const profilePatch = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    locale: z.enum(locales).optional(),
  })
  .refine((v) => v.name !== undefined || v.locale !== undefined)

const preferencesPatch = z
  .object({
    autoConnect: z.boolean().optional(),
    killSwitch: z.boolean().optional(),
    newsletter: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0)

const newDevice = z.object({
  name: z.string().trim().min(1).max(40),
  platform: z.enum(platformIds),
})

// Everything under /api/me works only on the signed-in user's own rows:
// every query below is filtered by c.get('user').id.
export function meRoutes({ db, auth }: { db: Db; auth: Auth }) {
  async function loadSubscription(userId: string) {
    const [row] = await db.select().from(subscription).where(eq(subscription.userId, userId))
    return row ? toSubscription(row) : null
  }

  async function loadMe(userId: string, profile: Me['user']): Promise<Me> {
    const [prefs] = await db.select().from(preferences).where(eq(preferences.userId, userId))
    return { user: profile, subscription: await loadSubscription(userId), preferences: toPreferences(prefs) }
  }

  return new Hono<AppEnv>()
    .use(requireUser(auth))
    .get('/', async (c) => c.json(await loadMe(c.get('user').id, toProfile(c.get('user')))))
    .patch('/', async (c) => {
      const patch = await readBody(c, profilePatch)
      const [updated] = await db.update(user).set(patch).where(eq(user.id, c.get('user').id)).returning()
      return c.json(await loadMe(updated.id, toProfile({ ...c.get('user'), ...updated })))
    })
    .patch('/preferences', async (c) => {
      const patch = await readBody(c, preferencesPatch)
      const userId = c.get('user').id
      const [row] = await db
        .insert(preferences)
        .values({ ...defaultPreferences, ...patch, userId })
        .onConflictDoUpdate({ target: preferences.userId, set: patch })
        .returning()
      return c.json(toPreferences(row))
    })
    .post('/subscription/cancel', async (c) => {
      const userId = c.get('user').id
      const current = await loadSubscription(userId)
      if (!current || current.plan === 'free' || current.status === 'canceled') throw new AppError('not_found', 404)
      const [row] = await db
        .update(subscription)
        .set({ status: 'canceled' })
        .where(eq(subscription.userId, userId))
        .returning()
      return c.json(toSubscription(row))
    })
    .get('/devices', async (c) => {
      const rows = await db
        .select()
        .from(device)
        .where(eq(device.userId, c.get('user').id))
        .orderBy(device.createdAt)
      return c.json(rows.map(toDevice))
    })
    .post('/devices', async (c) => {
      const body = await readBody(c, newDevice)
      const userId = c.get('user').id
      const sub = await loadSubscription(userId)
      const [{ used }] = await db.select({ used: count() }).from(device).where(eq(device.userId, userId))
      if (used >= deviceLimit(sub?.plan)) throw new AppError('device_limit', 409)
      const [row] = await db
        .insert(device)
        .values({ id: `DEV-${randomUUID()}`, userId, ...body })
        .returning()
      return c.json(toDevice(row), 201)
    })
    .delete('/devices/:id', async (c) => {
      const deleted = await db
        .delete(device)
        .where(and(eq(device.id, c.req.param('id')), eq(device.userId, c.get('user').id)))
        .returning({ id: device.id })
      if (!deleted.length) throw new AppError('not_found', 404)
      return c.body(null, 204)
    })
    // Better Auth's list-sessions demands a fresh login, and sessions here last 30 days.
    .get('/sessions', async (c) => {
      const rows = await db
        .select()
        .from(session)
        .where(and(eq(session.userId, c.get('user').id), gt(session.expiresAt, new Date())))
        .orderBy(desc(session.createdAt))
      const current = c.get('session').id
      const body: SessionInfo[] = rows.map((row) => ({
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        userAgent: row.userAgent,
        current: row.id === current,
      }))
      return c.json(body)
    })
    .get('/payments', async (c) => {
      const rows = await db
        .select()
        .from(payment)
        .where(eq(payment.userId, c.get('user').id))
        .orderBy(desc(payment.createdAt))
      return c.json(rows.map(toPayment))
    })
}
