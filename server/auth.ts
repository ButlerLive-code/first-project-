import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api'
import { admin, twoFactor } from 'better-auth/plugins'
import { deleteSessionCookie } from 'better-auth/cookies'
import { generateRandomString } from 'better-auth/crypto'
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
    account: {
      // Link Google only to a confirmed local account. Better Auth's default
      // already refuses an unconfirmed one; with requireEmailVerification off,
      // that is the only thing stopping a pre-registered account takeover.
      accountLinking: { enabled: true, trustedProviders: ['google'], requireLocalEmailVerified: true },
    },
    socialProviders: config.google
      ? {
          google: {
            clientId: config.google.clientId,
            clientSecret: config.google.clientSecret,
            // The ID-token flow returns a session straight from sign-in/social,
            // where neither the 2FA hook nor the plugin's applies. The site only
            // uses the redirect flow.
            disableIdTokenSignIn: true,
          },
        }
      : {},
    // Every OAuth failure (cancelled, bad state, not linkable) ends on a site
    // page, never on Better Auth's English /api/auth/error. The sign-in call
    // names the page in the visitor's language; this covers failures that
    // happen before that is known. Better Auth appends ?error=<code>.
    onAPIError: { errorURL: `${config.appUrl}/login` },
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
      // Deleting an account needs the password, not just a fresh session. A user
      // with no password (signed up with Google) has none to give, so for them
      // Better Auth's fresh-session check is the gate.
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
          const current = await getSessionFromCtx(ctx)
          // No session: Better Auth's own unauthorized answer applies.
          if (!current) return
          const accounts = await ctx.context.internalAdapter.findAccounts(current.user.id)
          if (accounts.some((a) => a.providerId === 'credential')) {
            throw new APIError('BAD_REQUEST', { code: 'VALIDATION_ERROR', message: 'password required' })
          }
        }
      }),
      // The reset request answers the same bare body for known and unknown
      // emails; Better Auth's English message never reaches the browser.
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path === '/request-password-reset') return ctx.json({ status: true })
        // The twoFactor plugin only guards password sign-in. A Google sign-in
        // of a 2FA account must not skip the second step: swap the new session
        // for the same challenge the password flow sets, and send the browser
        // to the site's code page.
        if (ctx.path === '/callback/:id') {
          const created = ctx.context.newSession
          const target = ctx.context.responseHeaders?.get('location')
          if (!created?.user.twoFactorEnabled || !target) return
          deleteSessionCookie(ctx, true)
          await ctx.context.internalAdapter.deleteSession(created.session.token)
          ctx.context.setNewSession(null)
          const maxAge = 600
          const cookie = ctx.context.createAuthCookie('two_factor', { maxAge })
          const identifier = `2fa-${generateRandomString(20)}`
          const expiresAt = new Date(Date.now() + maxAge * 1000)
          await ctx.context.internalAdapter.createVerificationValue({ value: created.user.id, identifier, expiresAt })
          await ctx.context.internalAdapter.createVerificationValue({ value: '0', identifier: `2fa-attempts-${identifier}`, expiresAt })
          await ctx.setSignedCookie(cookie.name, identifier, ctx.context.secret, cookie.attributes)
          const to = new URL(target, config.appUrl)
          const lang = to.pathname === '/ru' || to.pathname.startsWith('/ru/') ? '/ru' : ''
          throw ctx.redirect(`${lang}/login/2fa?next=${encodeURIComponent(to.pathname + to.search)}`)
        }
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
