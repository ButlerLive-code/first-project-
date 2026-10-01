// `npm run db:reset`: deletes the local database; the next start of the API
// recreates it, applies migrations and seeds it again.
import { rmSync } from 'node:fs'
import { loadConfig } from '../config.ts'

const { dataDir } = loadConfig()
rmSync(dataDir, { recursive: true, force: true })
console.log(`[db] removed ${dataDir}; start the API to recreate and seed it`)
