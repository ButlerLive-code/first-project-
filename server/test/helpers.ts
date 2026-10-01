// Test harness: a fresh app per call. Test files call createTestApp() in
// beforeAll and close() in afterAll, and talk to the app only through call().
import { createApp } from '../app.ts'
import { loadConfig } from '../config.ts'

export const APP_URL = 'http://localhost:5173'

interface CallOptions {
  method?: string
  body?: unknown
  cookie?: string
  origin?: string | null
  headers?: Record<string, string>
}

export async function createTestApp(options: { env?: Record<string, string> } = {}) {
  const config = loadConfig({ NODE_ENV: 'test', APP_URL, ...options.env })
  const app = createApp({ config })

  // Like a browser on the site: JSON body, Origin of the site, optional cookie.
  async function call(path: string, { method = 'GET', body, cookie, origin = APP_URL, headers = {} }: CallOptions = {}) {
    const h: Record<string, string> = { ...headers }
    if (origin) h.origin = origin
    if (cookie) h.cookie = cookie
    if (body !== undefined) h['content-type'] = 'application/json'
    return app.request(path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) })
  }

  return { app, config, call, close: async () => {} }
}

export type TestApp = Awaited<ReturnType<typeof createTestApp>>

export async function json<T = Record<string, unknown>>(res: Response): Promise<T> {
  return (await res.json()) as T
}
