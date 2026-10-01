import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createEmailVerificationToken } from 'better-auth/api'
import { createTestApp, json, PASSWORD, type TestApp } from './test/helpers.ts'

let t: TestApp
beforeAll(async () => {
  t = await createTestApp()
})
afterAll(async () => {
  await t.close()
})

describe('sign-up, confirmation and sign-in', () => {
  it('signs up, mails a confirmation link, confirms and signs in', async () => {
    const cookie = await t.signUp('ann@example.com', { name: 'Ann' })
    expect(cookie).toContain('better-auth.session_token=')

    const session = await json<{ user: { emailVerified: boolean; role: string; locale: string } }>(
      await t.call('/api/auth/get-session', { cookie }),
    )
    expect(session.user).toMatchObject({ emailVerified: false, role: 'customer', locale: 'en' })

    const mail = await t.lastMail('ann@example.com')
    expect(mail.subject).toBe('Confirm your email for LaslesVPN')
    const link = t.linkIn(mail)
    expect(link.origin + link.pathname).toBe('http://localhost:5173/verify-email')
    const payload = JSON.parse(Buffer.from(t.tokenIn(mail).split('.')[1], 'base64url').toString())
    expect(Math.abs(payload.exp - (Date.now() / 1000 + 86400))).toBeLessThan(60)

    expect((await t.verifyEmail('ann@example.com')).status).toBe(200)

    const { res, cookie: fresh } = await t.signIn('ann@example.com')
    expect(res.status).toBe(200)
    const after = await json<{ user: { emailVerified: boolean } }>(
      await t.call('/api/auth/get-session', { cookie: fresh }),
    )
    expect(after.user.emailVerified).toBe(true)
  })

  it('writes the confirmation in the language of the sign-up page', async () => {
    await t.signUp('boris@example.com', { name: 'Борис', locale: 'ru' })
    const mail = await t.lastMail('boris@example.com')
    expect(mail.subject).toBe('Подтвердите email для LaslesVPN')
    expect(mail.text).toContain('Здравствуйте, Борис!')
    expect(t.linkIn(mail).pathname).toBe('/ru/verify-email')
  })

  it('ignores an unknown sign-up language', async () => {
    const cookie = await t.signUp('xx@example.com', { locale: 'xx' })
    const session = await json<{ user: { locale: string } }>(await t.call('/api/auth/get-session', { cookie }))
    expect(session.user.locale).toBe('en')
  })

  it('never lets sign-up choose a role', async () => {
    const res = await t.call('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Eve', email: 'eve@example.com', password: PASSWORD, role: 'admin' },
    })
    expect(res.status).toBe(400)
    expect(await json(res)).toEqual({ error: { code: 'validation_failed' } })
  })
})

describe('error codes', () => {
  it('a wrong password and an unknown email give the same invalid_credentials', async () => {
    await t.signUp('carl@example.com')
    for (const [email, password] of [
      ['carl@example.com', 'wrong-password'],
      ['nobody@example.com', PASSWORD],
    ]) {
      const { res } = await t.signIn(email, password)
      expect(res.status).toBe(401)
      expect(await json(res)).toEqual({ error: { code: 'invalid_credentials' } })
    }
  })

  it('a short password is weak_password', async () => {
    const res = await t.call('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Dan', email: 'dan@example.com', password: 'short' },
    })
    expect(res.status).toBe(400)
    expect(await json(res)).toEqual({ error: { code: 'weak_password' } })
  })

  it('a taken email is email_taken', async () => {
    await t.signUp('dup@example.com')
    const res = await t.call('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Dup', email: 'dup@example.com', password: PASSWORD },
    })
    expect(await json(res)).toEqual({ error: { code: 'email_taken' } })
  })

  it('confirmation links: garbage is token_invalid, an old link is token_expired', async () => {
    const bad = await t.call('/api/auth/verify-email?token=not-a-token')
    expect(await json(bad)).toEqual({ error: { code: 'token_invalid' } })

    await t.signUp('late@example.com')
    const expired = await createEmailVerificationToken(t.config.secret, 'late@example.com', undefined, -60)
    const res = await t.call(`/api/auth/verify-email?token=${expired}`)
    expect(await json(res)).toEqual({ error: { code: 'token_expired' } })
  })

  it('error bodies never carry Better Auth English messages', async () => {
    const { res } = await t.signIn('carl@example.com', 'wrong-password')
    expect(Object.keys(await json(res))).toEqual(['error'])
  })
})

describe('rate limiting', () => {
  it('too many sign-in attempts give rate_limited', async () => {
    const limited = await createTestApp({ rateLimit: true })
    try {
      const codes: number[] = []
      for (let i = 0; i < 4; i++) {
        const res = await limited.call('/api/auth/sign-in/email', {
          method: 'POST',
          body: { email: 'x@example.com', password: 'whatever-1' },
          headers: { 'x-forwarded-for': '203.0.113.7' },
        })
        codes.push(res.status)
        if (res.status === 429) expect(await json(res)).toEqual({ error: { code: 'rate_limited' } })
      }
      expect(codes.at(-1)).toBe(429)
    } finally {
      await limited.close()
    }
  })
})

describe('session cookie', () => {
  it('is httpOnly, SameSite=Lax and lasts 30 days; Secure in production', async () => {
    const res = await t.call('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Cookie', email: 'cookie@example.com', password: PASSWORD },
    })
    const cookie = res.headers.getSetCookie().find((c) => c.includes('session_token='))
    expect(cookie).toMatch(/HttpOnly/)
    expect(cookie).toMatch(/SameSite=Lax/)
    expect(cookie).toMatch(/Max-Age=2592000/)
    expect(cookie).not.toMatch(/Secure/)

    const prod = await createTestApp({ env: { NODE_ENV: 'production', BETTER_AUTH_SECRET: 'p'.repeat(32) } })
    try {
      const prodRes = await prod.call('/api/auth/sign-up/email', {
        method: 'POST',
        body: { name: 'Prod', email: 'prod@example.com', password: PASSWORD },
      })
      const prodCookie = prodRes.headers.getSetCookie().find((c) => c.includes('session_token='))
      expect(prodCookie).toMatch(/^__Secure-/)
      expect(prodCookie).toMatch(/; Secure/)
    } finally {
      await prod.close()
    }
  })
})
