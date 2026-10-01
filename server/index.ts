// API server entry. In development scripts/dev.mjs runs it with `node --watch`;
// Node runs the TypeScript directly (type stripping), no build step.
import { serve } from '@hono/node-server'
import { createApp } from './app.ts'
import { createAuth } from './auth.ts'
import { loadConfig } from './config.ts'
import { openDatabase } from './db/client.ts'
import { seed } from './db/seed.ts'
import { createDevMailer } from './mail/dev.ts'
import { createSmtpMailer } from './mail/smtp.ts'

const config = loadConfig()
// Creates .data/pglite on first start and applies pending migrations.
const { db, close } = await openDatabase(config.dataDir)
// Without SMTP_HOST mail stays local: /dev/mail and the console.
const mailer = config.smtp ? createSmtpMailer(config.smtp) : createDevMailer(db)
const auth = createAuth({ config, db, mailer })
if (!config.seed.enabled) {
  console.log('[db] seed skipped: in production set both SEED_ADMIN_PASSWORD and SEED_DEMO_PASSWORD to create the demo accounts')
} else if (await seed(db, auth, config.seed)) console.log('[db] seeded admin@laslesvpn.test and demo@laslesvpn.test')
const app = createApp({ config, db, auth })
// Loopback only: Vite proxies to it, and a direct client could spoof X-Forwarded-For.
const server = serve({ fetch: app.fetch, port: config.port, hostname: '127.0.0.1' }, ({ port }) => {
  console.log(`[api] http://localhost:${port} (site: ${config.appUrl})`)
})

function shutdown() {
  server.close()
  void close().finally(() => process.exit(0))
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
