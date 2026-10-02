import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import * as schema from './schema.ts'

export type Db = PgliteDatabase<typeof schema>

export interface Database {
  db: Db
  close: () => Promise<void>
}

const migrationsFolder = fileURLToPath(new URL('./migrations', import.meta.url))

// Opens PGlite (embedded Postgres) and applies pending migrations.
// `dataDir` is a folder on disk; without it the database lives in memory (tests).
export async function openDatabase(dataDir?: string): Promise<Database> {
  if (dataDir) mkdirSync(dataDir, { recursive: true })
  const client = new PGlite(dataDir)
  const db = drizzle({ client, schema })
  await migrate(db, { migrationsFolder })
  return { db, close: () => client.close() }
}
