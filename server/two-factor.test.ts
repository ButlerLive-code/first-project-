import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp, json, mergeCookies, PASSWORD, totp, type TestApp } from './test/helpers.ts'

let t: TestApp
beforeAll(async () => {
  t = await createTestApp()
})
afterAll(async () => {
  await t.close()
})

// Turns 2FA on the way the Settings page does: password → QR → first code.
async function enable(email: string) {
  const cookie = await t.verifiedUser(email)
  const res = await t.call('/api/auth/two-factor/enable', { method: 'POST', cookie, body: { password: PASSWORD } })
  expect(res.status).toBe(200)
  const { totpURI, backupCodes } = await json<{ totpURI: string; backupCodes: string[] }>(res)
  const nextCookie = mergeCookies(cookie, res)
  const verify = await t.call('/api/auth/two-factor/verify-totp', {
    method: 'POST',
    cookie: nextCookie,
    body: { code: totp(totpURI) },
  })
  expect(verify.status).toBe(200)
  return { totpURI, backupCodes, cookie: mergeCookies(nextCookie, verify) }
}

describe('two-factor sign-in', () => {
  it('enabling needs the password and gives 10 backup codes and an otpauth URI', async () => {
    const cookie = await t.verifiedUser('pw2fa@example.com')
    const wrong = await t.call('/api/auth/two-factor/enable', { method: 'POST', cookie, body: { password: 'nope-nope' } })
    expect(await json(wrong)).toEqual({ error: { code: 'invalid_credentials' } })

    const { totpURI, backupCodes, cookie: after } = await enable('on2fa@example.com')
    expect(totpURI).toMatch(/^otpauth:\/\/totp\/LaslesVPN:on2fa%40example\.com\?/)
    expect(backupCodes).toHaveLength(10)
    const me = await json<{ user: { twoFactorEnabled: boolean } }>(await t.call('/api/me', { cookie: after }))
    expect(me.user.twoFactorEnabled).toBe(true)
  })

  it('a password alone gives no session, only the second step', async () => {
    await enable('step@example.com')
    const { res, cookie } = await t.signIn('step@example.com')
    expect(res.status).toBe(200)
    expect(await json(res)).toMatchObject({ twoFactorRedirect: true })
    expect(cookie).not.toContain('session_token')
    expect((await t.call('/api/me', { cookie })).status).toBe(401)
  })

  it('signs in with an authenticator code', async () => {
    const { totpURI } = await enable('code@example.com')
    const { cookie } = await t.signIn('code@example.com')
    const wrong = await t.call('/api/auth/two-factor/verify-totp', { method: 'POST', cookie, body: { code: '000000' } })
    expect(await json(wrong)).toEqual({ error: { code: 'invalid_credentials' } })

    const res = await t.call('/api/auth/two-factor/verify-totp', { method: 'POST', cookie, body: { code: totp(totpURI) } })
    expect(res.status).toBe(200)
    expect((await t.call('/api/me', { cookie: mergeCookies(cookie, res) })).status).toBe(200)
  })

  it('signs in with a backup code, and each backup code works once', async () => {
    const { backupCodes } = await enable('backup@example.com')
    const first = await t.signIn('backup@example.com')
    const res = await t.call('/api/auth/two-factor/verify-backup-code', {
      method: 'POST',
      cookie: first.cookie,
      body: { code: backupCodes[0] },
    })
    expect(res.status).toBe(200)
    expect((await t.call('/api/me', { cookie: mergeCookies(first.cookie, res) })).status).toBe(200)

    const second = await t.signIn('backup@example.com')
    const reuse = await t.call('/api/auth/two-factor/verify-backup-code', {
      method: 'POST',
      cookie: second.cookie,
      body: { code: backupCodes[0] },
    })
    expect(await json(reuse)).toEqual({ error: { code: 'invalid_credentials' } })
  })

  it('turning it off needs the password', async () => {
    const { cookie } = await enable('off@example.com')
    const wrong = await t.call('/api/auth/two-factor/disable', { method: 'POST', cookie, body: { password: 'nope-nope' } })
    expect(await json(wrong)).toEqual({ error: { code: 'invalid_credentials' } })
    const res = await t.call('/api/auth/two-factor/disable', { method: 'POST', cookie, body: { password: PASSWORD } })
    expect(res.status).toBe(200)
    const { res: plain } = await t.signIn('off@example.com')
    expect(await json(plain)).not.toHaveProperty('twoFactorRedirect')
  })

  it('2FA is not on until the first code is confirmed', async () => {
    const cookie = await t.verifiedUser('pending@example.com')
    const res = await t.call('/api/auth/two-factor/enable', { method: 'POST', cookie, body: { password: PASSWORD } })
    expect(res.status).toBe(200)
    const me = await json<{ user: { twoFactorEnabled: boolean } }>(
      await t.call('/api/me', { cookie: mergeCookies(cookie, res) }),
    )
    expect(me.user.twoFactorEnabled).toBe(false)
    const { res: plain } = await t.signIn('pending@example.com')
    expect(await json(plain)).not.toHaveProperty('twoFactorRedirect')
  })

  it('a challenge dies after 5 wrong codes, even for the right code', async () => {
    const { totpURI } = await enable('limit@example.com')
    const { cookie } = await t.signIn('limit@example.com')
    const verify = (code: string) => t.call('/api/auth/two-factor/verify-totp', { method: 'POST', cookie, body: { code } })
    for (let i = 0; i < 5; i++) expect(await json(await verify('000000'))).toEqual({ error: { code: 'invalid_credentials' } })
    const late = await verify(totp(totpURI))
    expect(late.status).not.toBe(200)
    // unauthorized sends /login/2fa back to the password step.
    expect(await json(late)).toEqual({ error: { code: 'unauthorized' } })
  })

  it('after 10 wrong codes the account is locked, which the page tells apart from a short wait', async () => {
    const { totpURI } = await enable('lockout@example.com')
    for (let round = 0; round < 2; round++) {
      const { cookie } = await t.signIn('lockout@example.com')
      for (let i = 0; i < 5; i++) {
        await t.call('/api/auth/two-factor/verify-totp', { method: 'POST', cookie, body: { code: '000000' } })
      }
    }
    const { cookie } = await t.signIn('lockout@example.com')
    const locked = await t.call('/api/auth/two-factor/verify-totp', { method: 'POST', cookie, body: { code: totp(totpURI) } })
    expect(locked.status).toBe(429)
    expect(await json(locked)).toEqual({ error: { code: 'forbidden' } })
  })
})
