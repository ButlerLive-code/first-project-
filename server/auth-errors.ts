import type { ErrorCode } from '../shared/api.ts'

// Better Auth error codes → the site's error codes. Anything not listed falls
// back by HTTP status (see toErrorCode).
const byAuthCode: Record<string, ErrorCode> = {
  INVALID_EMAIL_OR_PASSWORD: 'invalid_credentials',
  INVALID_PASSWORD: 'invalid_credentials',
  CREDENTIAL_ACCOUNT_NOT_FOUND: 'invalid_credentials',
  INVALID_CODE: 'invalid_credentials',
  INVALID_BACKUP_CODE: 'invalid_credentials',
  EMAIL_NOT_VERIFIED: 'email_not_verified',
  BANNED_USER: 'account_banned',
  TOKEN_EXPIRED: 'token_expired',
  INVALID_TOKEN: 'token_invalid',
  USER_NOT_FOUND: 'token_invalid',
  INVALID_USER: 'token_invalid',
  PASSWORD_TOO_SHORT: 'weak_password',
  PASSWORD_TOO_LONG: 'weak_password',
  USER_ALREADY_EXISTS: 'email_taken',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'email_taken',
  // The 2FA challenge is dead after 5 wrong codes: the page must start over.
  TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: 'unauthorized',
  // The account-wide 2FA lockout (up to 15 minutes), told apart from a short
  // rate limit, which stays rate_limited.
  ACCOUNT_TEMPORARILY_LOCKED: 'forbidden',
  INVALID_TWO_FACTOR_COOKIE: 'unauthorized',
  SESSION_EXPIRED: 'unauthorized',
  VALIDATION_ERROR: 'validation_failed',
}

export function toErrorCode(status: number, authCode: unknown): ErrorCode {
  if (typeof authCode === 'string' && byAuthCode[authCode]) return byAuthCode[authCode]
  if (status === 429) return 'rate_limited'
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not_found'
  if (status >= 500) return 'server_error'
  return 'validation_failed'
}

// Rewrites a Better Auth error response so the browser only ever sees
// { error: { code } }, never Better Auth's English messages. Cookies and
// other headers are kept; successful responses pass through untouched.
export async function rewriteAuthError(response: Response): Promise<Response> {
  if (response.status < 400) return response
  let authCode: unknown
  try {
    authCode = ((await response.clone().json()) as { code?: unknown }).code
  } catch {
    authCode = undefined
  }
  const headers = new Headers(response.headers)
  headers.delete('content-length')
  headers.set('content-type', 'application/json')
  return new Response(JSON.stringify({ error: { code: toErrorCode(response.status, authCode) } }), {
    status: response.status,
    headers,
  })
}
