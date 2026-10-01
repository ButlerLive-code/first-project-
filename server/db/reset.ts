// `npm run db:reset`: deletes the local database; the next start of the API
// recreates it, applies migrations and seeds it again.
import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { loadConfig } from '../config.ts'
import { assertSafeDataDir } from './safe-data-dir.ts'

// The project root comes from this file's location, not process.cwd(): it stays
// correct wherever the command is started from, so the check cannot be fooled by cwd.
const root = fileURLToPath(new URL('../..', import.meta.url))

try {
  const target = assertSafeDataDir(loadConfig().dataDir, root)
  rmSync(target, { recursive: true, force: true })
  console.log(`[db] removed ${target}; start the API to recreate and seed it`)
} catch (error) {
  console.error(`[db] ${error instanceof Error ? error.message : error}`)
  process.exit(1)
}
