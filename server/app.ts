import { Hono } from 'hono'
import type { AppConfig } from '../shared/api.ts'
import { rewriteAuthError } from './auth-errors.ts'
import type { Auth } from './auth.ts'
import type { Config } from './config.ts'
import type { Db } from './db/client.ts'
import { AppError, errorResponse } from './errors.ts'
import { checkOrigin } from './middleware.ts'
import { devMailRoutes } from './routes/dev-mail.ts'

export interface AppDeps {
  config: Config
  db: Db
  auth: Auth
}

export function createApp({ config, db, auth }: AppDeps) {
  const app = new Hono()

  // Changing requests must come from the site itself.
  app.use('/api/*', checkOrigin(config.appUrl))

  app.get('/api/config', (c) => {
    const body: AppConfig = { googleEnabled: config.google !== null, devMail: config.devMail }
    return c.json(body)
  })

  // Better Auth answers everything under /api/auth; its errors are reduced to { error: { code } }.
  app.on(['GET', 'POST'], '/api/auth/*', async (c) => rewriteAuthError(await auth.handler(c.req.raw)))

  if (config.devMail) app.route('/api/dev/mail', devMailRoutes({ db }))

  app.notFound((c) => errorResponse(c, 'not_found', 404))
  app.onError((err, c) => {
    if (err instanceof AppError) return errorResponse(c, err.code, err.status)
    console.error(err)
    return errorResponse(c, 'server_error', 500)
  })

  return app
}
