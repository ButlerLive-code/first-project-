import { desc } from 'drizzle-orm'
import { Hono } from 'hono'
import type { DevMail } from '../../shared/api.ts'
import type { Db } from '../db/client.ts'
import { devMail } from '../db/schema.ts'

// Mounted only when config.devMail is on (never in production).
export function devMailRoutes({ db }: { db: Db }) {
  return new Hono().get('/', async (c) => {
    const rows = await db.select().from(devMail).orderBy(desc(devMail.id)).limit(50)
    const body: DevMail[] = rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))
    return c.json(body)
  })
}
