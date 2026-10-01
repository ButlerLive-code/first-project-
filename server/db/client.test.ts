import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { openDatabase, type Database } from './client.ts'
import { device, payment, preferences, subscription, user } from './schema.ts'

let database: Database
beforeAll(async () => {
  database = await openDatabase()
})
afterAll(async () => {
  await database.close()
})

it('applies the migrations to a fresh in-memory database', async () => {
  const result = await database.db.execute<{ table_name: string }>(
    sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`,
  )
  expect(result.rows.map((r) => r.table_name)).toEqual([
    'account',
    'dev_mail',
    'device',
    'payment',
    'preferences',
    'session',
    'subscription',
    'two_factor',
    'user',
    'verification',
  ])
})

it('new users are customers writing in English by default', async () => {
  const [row] = await database.db
    .insert(user)
    .values({ id: 'u-default', name: 'Default', email: 'default@example.com' })
    .returning()
  expect(row).toMatchObject({ role: 'customer', locale: 'en', emailVerified: false, banned: false })
})

it("deleting a user deletes all of the user's rows", async () => {
  const { db } = database
  await db.insert(user).values({ id: 'u1', name: 'Ann', email: 'ann@example.com' })
  await db.insert(subscription).values({ userId: 'u1', plan: 'standard', billing: 'monthly' })
  await db.insert(device).values({ id: 'd1', userId: 'u1', name: 'Laptop', platform: 'macos' })
  await db.insert(payment).values({
    id: 'INV-1',
    userId: 'u1',
    plan: 'standard',
    billing: 'monthly',
    amount: 900,
    cardBrand: 'Visa',
    cardLast4: '4242',
  })
  await db.insert(preferences).values({ userId: 'u1' })

  await db.delete(user).where(eq(user.id, 'u1'))

  for (const table of [subscription, device, payment, preferences]) {
    expect(await db.select().from(table).where(eq(table.userId, 'u1'))).toEqual([])
  }
})

it('keeps data between openings of the same folder', async () => {
  const { mkdtempSync, rmSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const dir = mkdtempSync(join(tmpdir(), 'laslesvpn-db-'))
  try {
    const first = await openDatabase(dir)
    await first.db.insert(user).values({ id: 'u2', name: 'Bo', email: 'bo@example.com' })
    await first.close()
    const second = await openDatabase(dir)
    expect(await second.db.select().from(user)).toHaveLength(1)
    await second.close()
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
