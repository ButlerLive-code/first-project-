// API server entry. In development scripts/dev.mjs runs it with `node --watch`;
// Node runs the TypeScript directly (type stripping), no build step.
import { serve } from '@hono/node-server'
import { createApp } from './app.ts'
import { loadConfig } from './config.ts'

const config = loadConfig()
const app = createApp({ config })
const server = serve({ fetch: app.fetch, port: config.port }, ({ port }) => {
  console.log(`[api] http://localhost:${port} (site: ${config.appUrl})`)
})

function shutdown() {
  server.close()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
