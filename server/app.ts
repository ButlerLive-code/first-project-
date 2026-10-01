import { Hono } from 'hono'
import type { AppConfig } from '../shared/api.ts'
import type { Config } from './config.ts'
import { AppError, errorResponse } from './errors.ts'

export interface AppDeps {
  config: Config
}

export function createApp({ config }: AppDeps) {
  const app = new Hono()

  app.get('/api/config', (c) => {
    const body: AppConfig = { googleEnabled: config.google !== null, devMail: config.devMail }
    return c.json(body)
  })

  app.notFound((c) => errorResponse(c, 'not_found', 404))
  app.onError((err, c) => {
    if (err instanceof AppError) return errorResponse(c, err.code, err.status)
    console.error(err)
    return errorResponse(c, 'server_error', 500)
  })

  return app
}
