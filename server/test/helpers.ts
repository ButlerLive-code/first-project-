// Test harness: a fresh in-memory database and app per call. Test files call
// createTestApp() in beforeAll and close() in afterAll, and talk to the app
// only through call().
import { and, desc, eq } from 'drizzle-orm'
import { createApp } from '../app.ts'
import { createAuth } from '../auth.ts'
import { loadConfig } from '../config.ts'
import { openDatabase } from '../db/client.ts'
import { devMail } from '../db/schema.ts'
import { createDevMailer } from '../mail/dev.ts'

export const APP_URL = 'http://localhost:5173'
export const PASSWORD = 'correct-horse-1'

interface CallOptions {
  method?: string
  body?: unknown
  cookie?: string
  origin?: string | null
  headers?: Record<string, string>
}

// Merges the Set-Cookie headers of a response into a Cookie header value.
export function mergeCookies(previous: string, res: Response): string {
  const jar = new Map(
    previous
      .split('; ')
      .filter(Boolean)
      .map((pair) => [pair.slice(0, pair.indexOf('=')), pair] as const),
  )
  for (const header of res.headers.getSetCookie()) {
    const pair = header.split(';')[0]
    const name = pair.slice(0, pair.indexOf('='))
    if (/max-age=0/i.test(header) || pair.endsWith('=')) jar.delete(name)
    else jar.set(name, pair)
  }
  return [...jar.values()].join('; ')
}

export async function createTestApp(options: { rateLimit?: boolean; env?: Record<string, string> } = {}) {
  const config = loadConfig({ NODE_ENV: 'test', APP_URL, ...options.env })
  const database = await openDatabase()
  const { db } = database
  const mailer = createDevMailer(db, () => {})
  const auth = createAuth({ config, db, mailer, rateLimit: options.rateLimit ?? false })
  const app = createApp({ config, db, auth })

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

  async function signUp(email: string, opts: { name?: string; password?: string; locale?: string } = {}) {
    const res = await call('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: opts.name ?? 'Test User', email, password: opts.password ?? PASSWORD, locale: opts.locale ?? 'en' },
    })
    if (res.status !== 200) throw new Error(`sign-up failed: ${res.status} ${await res.text()}`)
    return mergeCookies('', res)
  }

  async function signIn(email: string, password = PASSWORD) {
    const res = await call('/api/auth/sign-in/email', { method: 'POST', body: { email, password } })
    return { res, cookie: mergeCookies('', res) }
  }

  async function verifyEmail(email: string, cookie?: string) {
    const token = tokenIn(await lastMail(email))
    return call(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, { cookie })
  }

  // A signed-in customer with a confirmed email: the common starting point.
  async function verifiedUser(email: string, opts: { name?: string; locale?: string } = {}) {
    const cookie = await signUp(email, opts)
    const res = await verifyEmail(email, cookie)
    if (res.status !== 200) throw new Error(`verify failed: ${res.status}`)
    return cookie
  }

  return {
    app,
    auth,
    db,
    mailer,
    config,
    call,
    lastMail,
    mailCount,
    linkIn,
    tokenIn,
    signUp,
    signIn,
    verifyEmail,
    verifiedUser,
    close: database.close,
  }
}

export type TestApp = Awaited<ReturnType<typeof createTestApp>>

export async function json<T = Record<string, unknown>>(res: Response): Promise<T> {
  return (await res.json()) as T
}
