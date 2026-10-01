import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { admin, twoFactor } from 'better-auth/plugins'
import { adminAc, userAc } from 'better-auth/plugins/admin/access'
import type { UserLocale } from '../shared/api.ts'
import type { Config } from './config.ts'
import type { Db } from './db/client.ts'
import * as schema from './db/schema.ts'
import { renderMail, siteLink, type MailKind } from './mail/templates.ts'
import type { Mailer } from './mail/types.ts'

export interface AuthDeps {
  config: Config
  db: Db
  mailer: Mailer
  // Off in tests unless a test is about rate limiting.
  rateLimit?: boolean
}

function userLocale(user: object): UserLocale {
  return 'locale' in user && user.locale === 'ru' ? 'ru' : 'en'
}

const THIRTY_DAYS = 60 * 60 * 24 * 30

export function createAuth({ config, db, mailer, rateLimit = true }: AuthDeps) {
  async function sendMail(
    kind: MailKind,
    user: { email: string; name: string },
    path: string,
    params: Record<string, string>,
  ) {
    const locale = userLocale(user)
    const url = siteLink(config.appUrl, locale, path, params)
    await mailer.send(renderMail(kind, locale, { to: user.email, name: user.name, url }))
  }

  return betterAuth({
    appName: 'LaslesVPN',
    baseURL: config.appUrl,
    basePath: '/api/auth',
    secret: config.secret,
    trustedOrigins: [config.appUrl],
    database: drizzleAdapter(db, { provider: 'pg', schema }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, token }) => {
        await sendMail('resetPassword', user, '/reset-password', { token, email: user.email })
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      expiresIn: 60 * 60 * 24,
      sendVerificationEmail: async ({ user, token }) => {
        await sendMail('verifyEmail', user, '/verify-email', { token })
      },
    },
    user: {
      additionalFields: {
        locale: { type: ['en', 'ru'], required: false, defaultValue: 'en', input: true },
      },
      deleteUser: { enabled: true },
    },
    session: { expiresIn: THIRTY_DAYS },
    rateLimit: {
      enabled: rateLimit,
      window: 60,
      max: 100,
    },
    advanced: {
      // Better Auth skips its Origin and callback-URL checks under test by
      // default; keep them on so the tests see what the browser gets.
      disableOriginCheck: false,
      useSecureCookies: config.isProduction,
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax' },
      ipAddress: { ipAddressHeaders: ['x-forwarded-for'] },
    },
    databaseHooks: {
      user: {
        create: {
          // Sign-up may only pick a language; anything else falls back to English.
          before: async (user) => ({ data: { ...user, locale: userLocale(user) } }),
        },
      },
    },
    hooks: {
      // Deleting an account always needs the password, not just a fresh session.
      before: createAuthMiddleware(async (ctx) => {
        // Sign-up falls back to English for an unknown language (see the user
        // create hook); a profile update must name a real one.
        if (ctx.path === '/update-user') {
          const locale = (ctx.body as { locale?: unknown } | undefined)?.locale
          if (locale !== undefined && locale !== 'en' && locale !== 'ru') {
            throw new APIError('BAD_REQUEST', { code: 'VALIDATION_ERROR', message: 'invalid locale' })
          }
        }
        if (ctx.path === '/delete-user' && !(ctx.body as { password?: unknown } | undefined)?.password) {
          throw new APIError('BAD_REQUEST', { code: 'VALIDATION_ERROR', message: 'password required' })
        }
      }),
      // The reset request answers the same bare body for known and unknown
      // emails; Better Auth's English message never reaches the browser.
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path === '/request-password-reset') return ctx.json({ status: true })
      }),
    },
    plugins: [
      twoFactor({ issuer: 'LaslesVPN' }),
      admin({
        roles: { customer: userAc, admin: adminAc, support: userAc, finance: userAc },
        defaultRole: 'customer',
        adminRoles: ['admin'],
      }),
    ],
    telemetry: { enabled: false },
  })
}

export type Auth = ReturnType<typeof createAuth>
