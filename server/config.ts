import * as z from 'zod'

const DEV_SECRET = 'dev-only-secret-change-me-dev-only-secret'

const envSchema = z.object({
  NODE_ENV: z.string().optional(),
  API_PORT: z.coerce.number().int().positive().default(3001),
  APP_URL: z.url().default('http://localhost:5173'),
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  DATABASE_URL: z.string().optional(),
  DATA_DIR: z.string().default('.data/pglite'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().default('LaslesVPN <no-reply@laslesvpn.test>'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('admin-password'),
  SEED_DEMO_PASSWORD: z.string().min(8).default('demo-password'),
})

export interface Config {
  isProduction: boolean
  port: number
  // Origin of the site as the browser sees it, e.g. http://localhost:5173.
  appUrl: string
  secret: string
  dataDir: string
  devMail: boolean
  google: { clientId: string; clientSecret: string } | null
  smtp: { host: string; port: number; user?: string; password?: string; from: string } | null
  // enabled is false in production unless both passwords are set explicitly.
  seed: { enabled: boolean; adminPassword: string; demoPassword: string }
}

// Reads process.env (or a test object) once at startup. Throws on values
// that would make the server unsafe or unusable.
export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  // `KEY=` lines in .env arrive as empty strings: treat them as unset.
  const e = envSchema.parse(Object.fromEntries(Object.entries(env).filter(([, value]) => value !== '')))
  const isProduction = e.NODE_ENV === 'production'
  if (isProduction && !e.BETTER_AUTH_SECRET) throw new Error('BETTER_AUTH_SECRET is required in production')
  if (e.DATABASE_URL) {
    throw new Error('DATABASE_URL (external Postgres) is not wired up yet; unset it to use the local PGlite database')
  }
  return {
    isProduction,
    port: e.API_PORT,
    appUrl: new URL(e.APP_URL).origin,
    secret: e.BETTER_AUTH_SECRET ?? DEV_SECRET,
    dataDir: e.DATA_DIR,
    devMail: !isProduction,
    google:
      e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET
        ? { clientId: e.GOOGLE_CLIENT_ID, clientSecret: e.GOOGLE_CLIENT_SECRET }
        : null,
    smtp: e.SMTP_HOST
      ? { host: e.SMTP_HOST, port: e.SMTP_PORT, user: e.SMTP_USER, password: e.SMTP_PASSWORD, from: e.SMTP_FROM }
      : null,
    seed: {
      enabled: !isProduction || Boolean(env.SEED_ADMIN_PASSWORD && env.SEED_DEMO_PASSWORD),
      adminPassword: e.SEED_ADMIN_PASSWORD,
      demoPassword: e.SEED_DEMO_PASSWORD,
    },
  }
}
