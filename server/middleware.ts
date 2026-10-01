import { createMiddleware } from 'hono/factory'
import type { Role } from '../shared/api.ts'
import type { Auth } from './auth.ts'
import { errorResponse } from './errors.ts'

type Session = NonNullable<Awaited<ReturnType<Auth['api']['getSession']>>>
export type SessionUser = Session['user']

export interface AppEnv {
  Variables: {
    user: SessionUser
    session: Session['session']
  }
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

// Changing requests must come from the site itself (CSRF guard on top of SameSite=Lax).
export function checkOrigin(appUrl: string) {
  return createMiddleware(async (c, next) => {
    if (!SAFE_METHODS.has(c.req.method) && c.req.header('origin') !== appUrl) {
      return errorResponse(c, 'forbidden', 403)
    }
    await next()
  })
}

// Loads the signed-in user from the session cookie. A banned user is
// stopped here even if an old session is still alive.
export function requireUser(auth: Auth) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const result = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!result) return errorResponse(c, 'unauthorized', 401)
    if (result.user.banned) return errorResponse(c, 'account_banned', 403)
    c.set('user', result.user)
    c.set('session', result.session)
    await next()
  })
}

// Use after requireUser: lets only the listed staff roles through.
export function requireRole(...roles: Role[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    if (!roles.includes(c.get('user').role as Role)) return errorResponse(c, 'forbidden', 403)
    await next()
  })
}
