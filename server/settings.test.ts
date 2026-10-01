import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp, json, mergeCookies, PASSWORD, type TestApp } from './test/helpers.ts'

let t: TestApp
beforeAll(async () => {
  t = await createTestApp()
})
afterAll(async () => {
  await t.close()
})

describe('change email', () => {
  it('mails the new address and switches only after the link is opened', async () => {
    const cookie = await t.verifiedUser('first@example.com', { locale: 'ru' })
    const res = await t.call('/api/auth/change-email', { method: 'POST', cookie, body: { newEmail: 'second@example.com' } })
    expect(res.status).toBe(200)

    let me = await json<{ user: { email: string } }>(await t.call('/api/me', { cookie }))
    expect(me.user.email).toBe('first@example.com')

    const mail = await t.lastMail('second@example.com')
    expect(mail.subject).toBe('Подтвердите новый email для LaslesVPN')
    expect(t.linkIn(mail).pathname).toBe('/ru/verify-email')

    const verify = await t.call(`/api/auth/verify-email?token=${t.tokenIn(mail)}`, { cookie })
    expect(verify.status).toBe(200)
    me = await json(await t.call('/api/me', { cookie: mergeCookies(cookie, verify) }))
    expect(me.user.email).toBe('second@example.com')
    expect((await t.signIn('second@example.com')).res.status).toBe(200)
  })

  it('a taken address looks the same to the requester and changes nothing', async () => {
    await t.signUp('taken@example.com')
    const cookie = await t.verifiedUser('mine@example.com')
    const fresh = await t.call('/api/auth/change-email', { method: 'POST', cookie, body: { newEmail: 'free@example.com' } })
    const res = await t.call('/api/auth/change-email', { method: 'POST', cookie, body: { newEmail: 'taken@example.com' } })
    expect(res.status).toBe(200)
    expect(await json(res)).toEqual(await json(fresh))
    expect(await t.mailCount('taken@example.com', 'Confirm your new email for LaslesVPN')).toBe(0)
  })
})

describe('change password', () => {
  it('needs the current password and signs other devices out', async () => {
    const laptop = await t.verifiedUser('pw@example.com')
    const { cookie: phone } = await t.signIn('pw@example.com')

    const wrong = await t.call('/api/auth/change-password', {
      method: 'POST',
      cookie: laptop,
      body: { currentPassword: 'nope-nope', newPassword: 'fresh-pass-1', revokeOtherSessions: true },
    })
    expect(await json(wrong)).toEqual({ error: { code: 'invalid_credentials' } })

    const res = await t.call('/api/auth/change-password', {
      method: 'POST',
      cookie: laptop,
      body: { currentPassword: PASSWORD, newPassword: 'fresh-pass-1', revokeOtherSessions: true },
    })
    expect(res.status).toBe(200)
    expect((await t.call('/api/me', { cookie: mergeCookies(laptop, res) })).status).toBe(200)
    expect((await t.call('/api/me', { cookie: phone })).status).toBe(401)
  })
})

describe('sessions', () => {
  it('lists active sessions and signs out everywhere', async () => {
    const a = await t.verifiedUser('multi@example.com')
    const { cookie: b } = await t.signIn('multi@example.com')
    const list = await json<{ id: string }[]>(await t.call('/api/auth/list-sessions', { cookie: a }))
    expect(list.length).toBeGreaterThanOrEqual(2)

    const res = await t.call('/api/auth/revoke-sessions', { method: 'POST', cookie: a, body: {} })
    expect(res.status).toBe(200)
    expect((await t.call('/api/me', { cookie: a })).status).toBe(401)
    expect((await t.call('/api/me', { cookie: b })).status).toBe(401)
  })
})
