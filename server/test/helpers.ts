// Test harness: a fresh in-memory database and app per call. Test files call
// createTestApp() in beforeAll and close() in afterAll, and talk to the app
// only through call().
import { and, desc, eq } from 'drizzle-orm'
import { createApp } from '../app.ts'
import { loadConfig } from '../config.ts'
import { openDatabase } from '../db/client.ts'
import { devMail } from '../db/schema.ts'
import { createDevMailer } from '../mail/dev.ts'

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
  const database = await openDatabase()
  const { db } = database
  const mailer = createDevMailer(db, () => {})
  const app = createApp({ config, db })

  // Like a browser on the site: JSON body, Origin of the site, optional cookie.
  async function call(path: string, { method = 'GET', body, cookie, origin = APP_URL, headers = {} }: CallOptions = {}) {
    const h: Record<string, string> = { ...headers }
    if (origin) h.origin = origin
    if (cookie) h.cookie = cookie
    if (body !== undefined) h['content-type'] = 'application/json'
    return app.request(path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) })
  }

  async function lastMail(to: string) {
    const [mail] = await db
      .select()
      .from(devMail)
      .where(eq(devMail.to, to))
      .orderBy(desc(devMail.id))
      .limit(1)
    if (!mail) throw new Error(`No mail to ${to}`)
    return mail
  }

  async function mailCount(to: string, subject?: string) {
    const rows = await db
      .select()
      .from(devMail)
      .where(subject ? and(eq(devMail.to, to), eq(devMail.subject, subject)) : eq(devMail.to, to))
    return rows.length
  }

  // The site link in a mail, e.g. http://localhost:5173/ru/verify-email?token=…
  function linkIn(mail: { text: string }) {
    const match = /https?:\/\/\S+/.exec(mail.text)
    if (!match) throw new Error('No link in mail')
    return new URL(match[0])
  }

  function tokenIn(mail: { text: string }) {
    const token = linkIn(mail).searchParams.get('token')
    if (!token) throw new Error('No token in mail link')
    return token
  }

  return { app, db, mailer, config, call, lastMail, mailCount, linkIn, tokenIn, close: database.close }
}

export type TestApp = Awaited<ReturnType<typeof createTestApp>>

export async function json<T = Record<string, unknown>>(res: Response): Promise<T> {
  return (await res.json()) as T
}
