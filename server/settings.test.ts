import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { session as sessionTable, user as userTable } from './db/schema.ts'
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
    const emails = (await t.db.select().from(userTable)).map((u) => u.email)
    expect(emails).toContain('taken@example.com')
    expect(emails).toContain('mine@example.com')
    expect((await json<{ user: { email: string } }>(await t.call('/api/me', { cookie }))).user.email).toBe('mine@example.com')
  })

  it('refuses a change while the current email is unconfirmed', async () => {
    const cookie = await t.signUp('unconfirmed@example.com')
    const res = await t.call('/api/auth/change-email', { method: 'POST', cookie, body: { newEmail: 'other-one@example.com' } })
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(await json(res)).toEqual({ error: { code: 'email_not_verified' } })
    expect(await t.mailCount('other-one@example.com')).toBe(0)
  })

  it('a link replayed after the old address was re-registered takes nothing over', async () => {
    const old = await t.verifiedUser('victim@example.com')
    await t.call('/api/auth/change-email', { method: 'POST', cookie: old, body: { newEmail: 'atk@example.com' } })
    const token = t.tokenIn(await t.lastMail('atk@example.com'))
    const del = await t.call('/api/auth/delete-user', { method: 'POST', cookie: old, body: { password: PASSWORD } })
    expect(del.status).toBe(200)
    // The real owner registers the same address afterwards.
    const real = await t.signUp('victim@example.com', { password: 'victim-secret-9' })
    expect((await t.verifyEmail('victim@example.com', real)).status).toBe(200)

    const replay = await t.call(`/api/auth/verify-email?token=${token}`)
    expect(replay.status).toBeGreaterThanOrEqual(400)
    expect(replay.status).toBeLessThan(500)
    expect(await json(replay)).toEqual({ error: { code: 'token_invalid' } })
    expect(replay.headers.getSetCookie()).toEqual([])
    const me = await json<{ user: { email: string } }>(await t.call('/api/me', { cookie: real }))
    expect(me.user.email).toBe('victim@example.com')
  })

  it('signs the other devices out once the change is confirmed', async () => {
    const laptop = await t.verifiedUser('devices@example.com')
    const { cookie: phone } = await t.signIn('devices@example.com')
    await t.call('/api/auth/change-email', { method: 'POST', cookie: laptop, body: { newEmail: 'devices2@example.com' } })
    const verify = await t.call(`/api/auth/verify-email?token=${t.tokenIn(await t.lastMail('devices2@example.com'))}`, { cookie: laptop })
    expect(verify.status).toBe(200)
    expect((await t.call('/api/me', { cookie: mergeCookies(laptop, verify) })).status).toBe(200)
    expect((await t.call('/api/me', { cookie: phone })).status).toBe(401)
  })

  it('confirmed in the browser that asked: that session stays, every other one ends', async () => {
    const laptop = await t.verifiedUser('same-browser@example.com')
    const { cookie: phone } = await t.signIn('same-browser@example.com')
    await t.call('/api/auth/change-email', { method: 'POST', cookie: laptop, body: { newEmail: 'same-browser2@example.com' } })
    const token = t.tokenIn(await t.lastMail('same-browser2@example.com'))
    const res = await t.call(`/api/auth/verify-email?token=${token}`, { cookie: laptop })
    expect(res.status).toBe(200)
    expect((await json<{ user: { email: string } }>(await t.call('/api/me', { cookie: mergeCookies(laptop, res) }))).user.email).toBe(
      'same-browser2@example.com',
    )
    expect((await t.call('/api/me', { cookie: phone })).status).toBe(401)
    const [u] = await t.db.select().from(userTable).where(eq(userTable.email, 'same-browser2@example.com'))
    expect(await t.db.select().from(sessionTable).where(eq(sessionTable.userId, u.id))).toHaveLength(1)
  })

  it('confirmed in a browser with no session: the email changes, nobody is signed in there, the asker stays', async () => {
    const laptop = await t.verifiedUser('other-browser@example.com')
    await t.call('/api/auth/change-email', { method: 'POST', cookie: laptop, body: { newEmail: 'other-browser2@example.com' } })
    const token = t.tokenIn(await t.lastMail('other-browser2@example.com'))
    const res = await t.call(`/api/auth/verify-email?token=${token}`)
    expect(res.status).toBe(200)
    expect(await json(res)).toEqual({ status: true, user: null })
    const cookie = mergeCookies('', res)
    expect(cookie).not.toContain('session_token')
    expect((await t.call('/api/me', { cookie })).status).toBe(401)
    const me = await json<{ user: { email: string } }>(await t.call('/api/me', { cookie: laptop }))
    expect(me.user.email).toBe('other-browser2@example.com')
    const [u] = await t.db.select().from(userTable).where(eq(userTable.email, 'other-browser2@example.com'))
    expect(await t.db.select().from(sessionTable).where(eq(sessionTable.userId, u.id))).toHaveLength(1)
  })

  it('confirmed on another device signed in to the same account: that device is signed out, the asker stays', async () => {
    const laptop = await t.verifiedUser('phone-confirm@example.com')
    const { cookie: phone } = await t.signIn('phone-confirm@example.com')
    await t.call('/api/auth/change-email', { method: 'POST', cookie: laptop, body: { newEmail: 'phone-confirm2@example.com' } })
    const token = t.tokenIn(await t.lastMail('phone-confirm2@example.com'))
    const res = await t.call(`/api/auth/verify-email?token=${token}`, { cookie: phone })
    expect(res.status).toBe(200)
    expect((await t.call('/api/me', { cookie: mergeCookies(phone, res) })).status).toBe(401)
    expect((await t.call('/api/me', { cookie: laptop })).status).toBe(200)
  })

  it('two opens of one link at once: the loser changes nothing and the asker stays signed in', async () => {
    const laptop = await t.verifiedUser('race-open@example.com')
    await t.call('/api/auth/change-email', { method: 'POST', cookie: laptop, body: { newEmail: 'race-open2@example.com' } })
    const token = t.tokenIn(await t.lastMail('race-open2@example.com'))
    const [a, b] = await Promise.all([
      t.call(`/api/auth/verify-email?token=${token}`, { cookie: laptop }),
      t.call(`/api/auth/verify-email?token=${token}`),
    ])
    expect([a.status, b.status]).toContain(200)
    expect(mergeCookies('', b)).not.toContain('session_token')
    const me = await t.call('/api/me', { cookie: mergeCookies(laptop, a) })
    expect(me.status).toBe(200)
    expect((await json<{ user: { email: string } }>(me)).user.email).toBe('race-open2@example.com')
  })

  it('a change link refuses a callbackURL, so the result cannot skip the session checks', async () => {
    const laptop = await t.verifiedUser('callback@example.com')
    await t.call('/api/auth/change-email', { method: 'POST', cookie: laptop, body: { newEmail: 'callback2@example.com' } })
    const token = t.tokenIn(await t.lastMail('callback2@example.com'))
    const res = await t.call(`/api/auth/verify-email?token=${token}&callbackURL=%2Fdashboard`)
    expect(res.status).toBe(400)
    expect(res.headers.getSetCookie()).toEqual([])
    expect((await json<{ user: { email: string } }>(await t.call('/api/me', { cookie: laptop }))).user.email).toBe('callback@example.com')
  })

  it('an address taken before the link is opened answers email_taken and changes nothing', async () => {
    const cookie = await t.verifiedUser('race@example.com')
    await t.call('/api/auth/change-email', { method: 'POST', cookie, body: { newEmail: 'later@example.com' } })
    const token = t.tokenIn(await t.lastMail('later@example.com'))
    await t.signUp('later@example.com')
    const res = await t.call(`/api/auth/verify-email?token=${token}`, { cookie })
    expect(await json(res)).toEqual({ error: { code: 'email_taken' } })
    expect((await json<{ user: { email: string } }>(await t.call('/api/me', { cookie }))).user.email).toBe('race@example.com')
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

describe('change password, weak', () => {
  it('rejects a short new password', async () => {
    const cookie = await t.verifiedUser('weak@example.com')
    const res = await t.call('/api/auth/change-password', {
      method: 'POST',
      cookie,
      body: { currentPassword: PASSWORD, newPassword: 'short', revokeOtherSessions: true },
    })
    expect(await json(res)).toEqual({ error: { code: 'weak_password' } })
  })
})

describe('GET /api/me/sessions', () => {
  it('lists only my sessions, marks the current one and exposes no token or IP', async () => {
    const a = await t.verifiedUser('lister@example.com')
    const { cookie: b } = await t.signIn('lister@example.com')
    await t.verifiedUser('someone-else@example.com')
    const list = await json<{ id: string; current: boolean }[]>(await t.call('/api/me/sessions', { cookie: a }))
    expect(list).toHaveLength(2)
    expect(list.filter((s) => s.current)).toHaveLength(1)
    expect(Object.keys(list[0]).sort()).toEqual(['createdAt', 'current', 'id', 'updatedAt', 'userAgent'])
    const mine = await json<{ id: string; current: boolean }[]>(await t.call('/api/me/sessions', { cookie: b }))
    expect(mine.find((s) => s.current)?.id).not.toBe(list.find((s) => s.current)?.id)
    expect((await t.call('/api/me/sessions')).status).toBe(401)
  })

  it('still lists a session older than a day', async () => {
    const cookie = await t.verifiedUser('aged@example.com')
    const [u] = await t.db.select().from(userTable).where(eq(userTable.email, 'aged@example.com'))
    await t.db.update(sessionTable).set({ createdAt: new Date(Date.now() - 2 * 86400e3) }).where(eq(sessionTable.userId, u.id))
    const res = await t.call('/api/me/sessions', { cookie })
    expect(res.status).toBe(200)
    expect(await json<unknown[]>(res)).toHaveLength(1)
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
