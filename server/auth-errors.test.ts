import { describe, expect, it } from 'vitest'
import { rewriteAuthError, toErrorCode } from './auth-errors.ts'

describe('toErrorCode', () => {
  it.each([
    [401, 'INVALID_EMAIL_OR_PASSWORD', 'invalid_credentials'],
    [400, 'INVALID_PASSWORD', 'invalid_credentials'],
    [403, 'BANNED_USER', 'account_banned'],
    [403, 'EMAIL_NOT_VERIFIED', 'email_not_verified'],
    [401, 'TOKEN_EXPIRED', 'token_expired'],
    [400, 'INVALID_TOKEN', 'token_invalid'],
    [400, 'PASSWORD_TOO_SHORT', 'weak_password'],
    [422, 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL', 'email_taken'],
    [400, 'VALIDATION_ERROR', 'validation_failed'],
    [429, undefined, 'rate_limited'],
    // The challenge is dead after 5 wrong codes: the page must start over.
    [400, 'TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE', 'unauthorized'],
    // The account-wide 2FA lockout (up to 15 minutes) is not a few-seconds wait.
    [429, 'ACCOUNT_TEMPORARILY_LOCKED', 'forbidden'],
    [401, 'SOMETHING_NEW', 'unauthorized'],
    [403, undefined, 'forbidden'],
    [404, undefined, 'not_found'],
    [500, undefined, 'server_error'],
    [400, 'SOMETHING_NEW', 'validation_failed'],
  ])('%s %s → %s', (status, code, expected) => {
    expect(toErrorCode(status, code)).toBe(expected)
  })
})

describe('rewriteAuthError', () => {
  it('keeps successful responses as they are', async () => {
    const ok = Response.json({ user: { id: '1' } })
    expect(await rewriteAuthError(ok)).toBe(ok)
  })

  it('replaces the English message with the code and keeps cookies', async () => {
    const res = new Response(JSON.stringify({ code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' }), {
      status: 401,
      headers: { 'content-type': 'application/json', 'set-cookie': 'a=; Max-Age=0' },
    })
    const out = await rewriteAuthError(res)
    expect(out.status).toBe(401)
    expect(out.headers.get('set-cookie')).toBe('a=; Max-Age=0')
    expect(await out.json()).toEqual({ error: { code: 'invalid_credentials' } })
  })

  it('handles an empty error body', async () => {
    const out = await rewriteAuthError(new Response(null, { status: 429 }))
    expect(await out.json()).toEqual({ error: { code: 'rate_limited' } })
  })
})
