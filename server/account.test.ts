import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { device, payment, preferences, session, subscription, user, verification } from './db/schema.ts'
import { createTestApp, json, PASSWORD, type TestApp } from './test/helpers.ts'

let t: TestApp
beforeAll(async () => {
  t = await createTestApp()
})
afterAll(async () => {
  await t.close()
})

async function requestReset(email: string) {
  return t.call('/api/auth/request-password-reset', { method: 'POST', body: { email } })
}

async function resetPassword(token: string, newPassword: string) {
  return t.call('/api/auth/reset-password', { method: 'POST', body: { token, newPassword } })
}

describe('password reset', () => {
  it('answers the same for unknown emails and sends nothing', async () => {
    const res = await requestReset('ghost@example.com')
    expect(res.status).toBe(200)
    expect(await t.mailCount('ghost@example.com')).toBe(0)
  })

  it('mails a one-time link in the user language, signs out everywhere, and the token works once', async () => {
    const oldCookie = await t.verifiedUser('rita@example.com', { locale: 'ru' })
    expect((await requestReset('rita@example.com')).status).toBe(200)

    const mail = await t.lastMail('rita@example.com')
    expect(mail.subject).toBe('Сброс пароля LaslesVPN')
    const link = t.linkIn(mail)
    expect(link.pathname).toBe('/ru/reset-password')
    expect(link.searchParams.get('email')).toBe('rita@example.com')
    const token = t.tokenIn(mail)

    expect((await resetPassword(token, 'brand-new-pass')).status).toBe(200)
    // Every old session is gone.
    expect(await json(await t.call('/api/auth/get-session', { cookie: oldCookie }))).toBeNull()
    // The old password no longer works, the new one does.
    expect((await t.signIn('rita@example.com', PASSWORD)).res.status).toBe(401)
    expect((await t.signIn('rita@example.com', 'brand-new-pass')).res.status).toBe(200)
    // Reusing the same link fails.
    const again = await resetPassword(token, 'another-pass-1')
    expect(again.status).toBe(400)
    expect(await json(again)).toEqual({ error: { code: 'token_invalid' } })
  })

  it('refuses a link older than one hour', async () => {
    await t.verifiedUser('old@example.com')
    await requestReset('old@example.com')
    const token = t.tokenIn(await t.lastMail('old@example.com'))
    const aged = await t.db
      .update(verification)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(verification.identifier, `reset-password:${token}`))
      .returning()
    expect(aged).toHaveLength(1)
    const res = await resetPassword(token, 'brand-new-pass')
    expect(await json(res)).toEqual({ error: { code: 'token_invalid' } })
  })
})

describe('banned users', () => {
  it('cannot sign in', async () => {
    await t.verifiedUser('bob@example.com')
    await t.db.update(user).set({ banned: true }).where(eq(user.email, 'bob@example.com'))

    const { res } = await t.signIn('bob@example.com')
    expect(res.status).toBe(403)
    expect(await json(res)).toEqual({ error: { code: 'account_banned' } })
  })
})

describe('account deletion', () => {
  it('needs the password', async () => {
    const cookie = await t.verifiedUser('keep@example.com')
    const res = await t.call('/api/auth/delete-user', { method: 'POST', body: {}, cookie })
    expect(res.status).toBe(400)
    expect(await json(res)).toEqual({ error: { code: 'validation_failed' } })
    const wrong = await t.call('/api/auth/delete-user', { method: 'POST', body: { password: 'nope-nope' }, cookie })
    expect(await json(wrong)).toEqual({ error: { code: 'invalid_credentials' } })
    expect(await json(await t.call('/api/auth/get-session', { cookie }))).not.toBeNull()
  })

  it('removes the user and every row that belongs to them', async () => {
    const cookie = await t.verifiedUser('gone@example.com')
    const [{ id }] = await t.db.select({ id: user.id }).from(user).where(eq(user.email, 'gone@example.com'))
    await t.db.insert(subscription).values({ userId: id, plan: 'standard', billing: 'monthly' })
    await t.db.insert(device).values({ id: 'DEV-gone', userId: id, name: 'Laptop', platform: 'macos' })
    await t.db.insert(payment).values({
      id: 'INV-GONE',
      userId: id,
      plan: 'standard',
      billing: 'monthly',
      amount: 900,
      cardBrand: 'Visa',
      cardLast4: '4242',
    })
    await t.db.insert(preferences).values({ userId: id, newsletter: true })

    const res = await t.call('/api/auth/delete-user', { method: 'POST', body: { password: PASSWORD }, cookie })
    expect(res.status).toBe(200)

    for (const table of [device, payment, subscription, preferences, session]) {
      expect(await t.db.select().from(table).where(eq(table.userId, id))).toEqual([])
    }
    expect(await t.db.select().from(user).where(eq(user.id, id))).toEqual([])
    expect(await json(await t.call('/api/auth/get-session', { cookie }))).toBeNull()
  })
})
