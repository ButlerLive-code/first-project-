import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { account, session, user } from './db/schema.ts'
import { APP_URL, createTestApp, json, mergeCookies, PASSWORD, totp, type TestApp } from './test/helpers.ts'

// Google's token endpoint, answered locally with an id_token that names whoever the test says.
let googleEmail = ''
let googleSub = ''
const realFetch = globalThis.fetch
beforeAll(() => {
  vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (!url.startsWith('https://oauth2.googleapis.com/token')) return realFetch(input, init)
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
    const now = Math.floor(Date.now() / 1000)
    const claims = {
      iss: 'https://accounts.google.com',
      aud: 'id.apps.googleusercontent.com',
      sub: googleSub,
      email: googleEmail,
      email_verified: true,
      name: 'Google Person',
      iat: now,
      exp: now + 3600,
    }
    const idToken = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64(claims)}.sig`
    return new Response(
      JSON.stringify({ access_token: 'at', id_token: idToken, token_type: 'Bearer', expires_in: 3600 }),
      { headers: { 'content-type': 'application/json' } },
    )
  })
})

// A whole Google round trip for the given Google identity, as the browser sees it.
async function googleRound(email: string, sub = `g-${email}`) {
  googleEmail = email
  googleSub = sub
  const start = await on.call('/api/auth/sign-in/social', {
    method: 'POST',
    body: { provider: 'google', callbackURL: '/ru/dashboard', errorCallbackURL: '/ru/login' },
  })
  const state = new URL((await json<{ url: string }>(start)).url).searchParams.get('state')!
  const res = await on.call(`/api/auth/callback/google?code=c&state=${state}`, { cookie: mergeCookies('', start) })
  return { res, cookie: mergeCookies('', res), path: sitePath(res) }
}

async function rowsOf(email: string) {
  const [u] = await on.db.select().from(user).where(eq(user.email, email))
  const accounts = await on.db.select().from(account).where(eq(account.userId, u.id))
  return { user: u, providers: accounts.map((a) => a.providerId) }
}

let off: TestApp
let on: TestApp
beforeAll(async () => {
  off = await createTestApp()
  on = await createTestApp({ env: { GOOGLE_CLIENT_ID: 'id.apps.googleusercontent.com', GOOGLE_CLIENT_SECRET: 'secret' } })
})
afterAll(async () => {
  await off.close()
  await on.close()
})

it('is reported and offered only when both keys are set', async () => {
  expect(await json(await off.call('/api/config'))).toEqual({ googleEnabled: false, devMail: true })
  const res = await off.call('/api/auth/sign-in/social', { method: 'POST', body: { provider: 'google', callbackURL: '/' } })
  expect(res.status).toBe(404)

  expect(await json(await on.call('/api/config'))).toEqual({ googleEnabled: true, devMail: true })
})

it('sends the browser to Google with our callback, keeping the page language for the way back', async () => {
  const res = await on.call('/api/auth/sign-in/social', {
    method: 'POST',
    body: { provider: 'google', callbackURL: '/ru/dashboard', errorCallbackURL: '/ru/login' },
  })
  expect(res.status).toBe(200)
  const { url } = await json<{ url: string }>(res)
  const google = new URL(url)
  expect(google.host).toBe('accounts.google.com')
  expect(google.searchParams.get('redirect_uri')).toBe('http://localhost:5173/api/auth/callback/google')
})

it('refuses to send the user back to another site afterwards', async () => {
  const res = await on.call('/api/auth/sign-in/social', {
    method: 'POST',
    body: { provider: 'google', callbackURL: 'https://evil.example/steal' },
  })
  expect(res.status).toBe(403)
  expect(await json(res)).toEqual({ error: { code: 'forbidden' } })
})

// Where a redirect points, as a site path (Better Auth may answer absolute or relative).
function sitePath(res: Response) {
  const location = res.headers.get('location')
  expect(location).not.toBeNull()
  const url = new URL(location!, APP_URL)
  expect(url.origin).toBe(APP_URL)
  return url.pathname + url.search
}

it('lands every failed callback on a site page, never on the English /api/auth/error page', async () => {
  // The user cancelled at Google: back to the login page in the language they started from.
  const start = await on.call('/api/auth/sign-in/social', {
    method: 'POST',
    body: { provider: 'google', callbackURL: '/ru/dashboard', errorCallbackURL: '/ru/login' },
  })
  const state = new URL((await json<{ url: string }>(start)).url).searchParams.get('state')!
  const cancelled = await on.call(`/api/auth/callback/google?error=access_denied&state=${state}`, {
    cookie: mergeCookies('', start),
  })
  expect(cancelled.status).toBe(302)
  expect(sitePath(cancelled)).toBe('/ru/login?error=access_denied')

  // A state we never issued has no language to go back to: still a site page.
  const badState = await on.call('/api/auth/callback/google?code=x&state=bogus')
  expect(badState.status).toBe(302)
  expect(sitePath(badState)).toMatch(/^\/login\?error=/)

  // The built-in error page itself is replaced too.
  const errorPage = await on.call('/api/auth/error?error=unable_to_link_account')
  expect(errorPage.status).toBe(302)
  expect(sitePath(errorPage)).toBe('/login?error=unable_to_link_account')
})

it('lets a Google-only user delete the account with a fresh session, but a password user still needs the password', async () => {
  // A Google-only account: signed in, no credential (password) account.
  const cookie = await on.verifiedUser('g-only@example.com')
  const [{ id }] = await on.db.select({ id: user.id }).from(user).where(eq(user.email, 'g-only@example.com'))
  await on.db.delete(account).where(eq(account.userId, id))
  await on.db.insert(account).values({ id: 'acc-g', accountId: 'g-123', providerId: 'google', userId: id })

  // Stale session: refused.
  await on.db.update(session).set({ createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000) }).where(eq(session.userId, id))
  const stale = await on.call('/api/auth/delete-user', { method: 'POST', body: {}, cookie })
  expect(stale.status).toBe(400)
  expect(await json(stale)).toEqual({ error: { code: 'unauthorized' } })

  await on.db.update(session).set({ createdAt: new Date() }).where(eq(session.userId, id))
  const res = await on.call('/api/auth/delete-user', { method: 'POST', body: {}, cookie })
  expect(res.status).toBe(200)
  expect(await on.db.select().from(user).where(eq(user.id, id))).toEqual([])

  // Has a password: a fresh session alone is not enough.
  const withPassword = await on.verifiedUser('has-pw@example.com')
  const refused = await on.call('/api/auth/delete-user', { method: 'POST', body: {}, cookie: withPassword })
  expect(refused.status).toBe(400)
  expect(await json(refused)).toEqual({ error: { code: 'validation_failed' } })
  const ok = await on.call('/api/auth/delete-user', { method: 'POST', body: { password: 'correct-horse-1' }, cookie: withPassword })
  expect(ok.status).toBe(200)
})

it('never links Google to an unconfirmed local account (pre-account takeover)', async () => {
  await on.signUp('victim@example.com', { password: 'attacker-pw-1' }) // never confirmed
  const { res, cookie, path } = await googleRound('victim@example.com')
  expect(path).toBe('/ru/login?error=account_not_linked')
  expect(cookie).toBe('')
  expect(res.headers.getSetCookie().some((c) => c.includes('session_token=') && !/max-age=0/i.test(c))).toBe(false)
  const { user: u, providers } = await rowsOf('victim@example.com')
  expect(u.emailVerified).toBe(false)
  expect(providers).toEqual(['credential'])
})

it('links Google to a confirmed account and signs in', async () => {
  await on.verifiedUser('confirmed@example.com')
  const { cookie, path } = await googleRound('confirmed@example.com')
  expect(path).toBe('/ru/dashboard')
  expect((await rowsOf('confirmed@example.com')).providers.sort()).toEqual(['credential', 'google'])
  expect((await on.call('/api/me', { cookie })).status).toBe(200)
})

it('creates a Google-only user for a new email', async () => {
  const { cookie, path } = await googleRound('new@example.com')
  expect(path).toBe('/ru/dashboard')
  const { user: u, providers } = await rowsOf('new@example.com')
  expect(providers).toEqual(['google'])
  expect(u.emailVerified).toBe(true)
  expect((await on.call('/api/me', { cookie })).status).toBe(200)
})

it('does not let Google skip the second step of a 2FA account, and a real code finishes it', async () => {
  const setupCookie = await on.verifiedUser('twofa@example.com')
  const enable = await on.call('/api/auth/two-factor/enable', { method: 'POST', cookie: setupCookie, body: { password: PASSWORD } })
  const { totpURI } = await json<{ totpURI: string }>(enable)
  const withEnable = mergeCookies(setupCookie, enable)
  const first = await on.call('/api/auth/two-factor/verify-totp', { method: 'POST', cookie: withEnable, body: { code: totp(totpURI) } })
  expect(first.status).toBe(200)

  const sessionsBefore = (await on.db.select().from(session)).length
  const { res, cookie, path } = await googleRound('twofa@example.com')
  expect(res.status).toBe(302)
  expect(path).toBe('/ru/login/2fa?next=%2Fru%2Fdashboard')
  expect(cookie).toContain('two_factor=')
  expect((await on.call('/api/me', { cookie })).status).toBe(401)
  expect((await on.db.select().from(session)).length).toBe(sessionsBefore)

  const done = await on.call('/api/auth/two-factor/verify-totp', { method: 'POST', cookie, body: { code: totp(totpURI, Date.now() + 30_000) } })
  expect(done.status).toBe(200)
  expect((await on.call('/api/me', { cookie: mergeCookies(cookie, done) })).status).toBe(200)
})

it('refuses a foreign error page too', async () => {
  const res = await on.call('/api/auth/sign-in/social', {
    method: 'POST',
    body: { provider: 'google', callbackURL: '/', errorCallbackURL: 'https://evil.example/x' },
  })
  expect(res.status).toBe(403)
  expect(await json(res)).toEqual({ error: { code: 'forbidden' } })
})
