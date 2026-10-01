// API server entry. In development scripts/dev.mjs runs it with `node --watch`;
// Node runs the TypeScript directly (type stripping), no build step.
import { serve } from '@hono/node-server'
import { createApp } from './app.ts'
import { createAuth } from './auth.ts'
import { loadConfig } from './config.ts'
import { openDatabase } from './db/client.ts'
import { createDevMailer } from './mail/dev.ts'
import { createSmtpMailer } from './mail/smtp.ts'

const config = loadConfig()
// Creates .data/pglite on first start and applies pending migrations.
const { db, close } = await openDatabase(config.dataDir)
// Without SMTP_HOST mail stays local: /dev/mail and the console.
const mailer = config.smtp ? createSmtpMailer(config.smtp) : createDevMailer(db)
const auth = createAuth({ config, db, mailer })
const app = createApp({ config, db, auth })
const server = serve({ fetch: app.fetch, port: config.port }, ({ port }) => {
  console.log(`[api] http://localhost:${port} (site: ${config.appUrl})`)
})

function shutdown() {
  server.close()
  void close().finally(() => process.exit(0))
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
