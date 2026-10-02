import { describe, expect, it } from 'vitest'
import { loadConfig } from './config.ts'

describe('loadConfig', () => {
  it('has working local defaults', () => {
    const config = loadConfig({})
    expect(config).toMatchObject({
      isProduction: false,
      port: 3001,
      appUrl: 'http://localhost:5173',
      dataDir: '.data/pglite',
      devMail: true,
      google: null,
      smtp: null,
    })
    expect(config.secret.length).toBeGreaterThanOrEqual(32)
  })

  it('treats empty values from .env as unset', () => {
    const config = loadConfig({ BETTER_AUTH_SECRET: '', GOOGLE_CLIENT_ID: '', SMTP_HOST: '', API_PORT: '' })
    expect(config).toMatchObject({ google: null, smtp: null, port: 3001 })
  })

  it('turns Google on only with both keys', () => {
    expect(loadConfig({ GOOGLE_CLIENT_ID: 'id' }).google).toBeNull()
    expect(loadConfig({ GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 's' }).google).toEqual({
      clientId: 'id',
      clientSecret: 's',
    })
  })

  it('normalises APP_URL to an origin', () => {
    expect(loadConfig({ APP_URL: 'https://vpn.example.com/' }).appUrl).toBe('https://vpn.example.com')
  })

  it('production needs a real secret and never exposes dev mail', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/BETTER_AUTH_SECRET/)
    const config = loadConfig({ NODE_ENV: 'production', BETTER_AUTH_SECRET: 'x'.repeat(32) })
    expect(config).toMatchObject({ isProduction: true, devMail: false })
  })

  it('refuses DATABASE_URL until an external Postgres driver is wired up', () => {
    expect(() => loadConfig({ DATABASE_URL: 'postgres://localhost/db' })).toThrow(/DATABASE_URL/)
  })
})

describe('loadConfig seed', () => {
  it('outside production the seed uses the local default passwords', () => {
    expect(loadConfig({}).seed).toMatchObject({ enabled: true, adminPassword: 'admin-password' })
  })

  it('in production the seed is enabled only when both passwords are set explicitly', () => {
    const base = { NODE_ENV: 'production', BETTER_AUTH_SECRET: 'x'.repeat(32) }
    expect(loadConfig(base).seed.enabled).toBe(false)
    expect(loadConfig({ ...base, SEED_ADMIN_PASSWORD: 'long-enough-1' }).seed.enabled).toBe(false)
    expect(
      loadConfig({ ...base, SEED_ADMIN_PASSWORD: 'long-enough-1', SEED_DEMO_PASSWORD: 'long-enough-2' }).seed,
    ).toEqual({ enabled: true, adminPassword: 'long-enough-1', demoPassword: 'long-enough-2' })
  })
})

describe('loadConfig production refuses public values', () => {
  const base = { NODE_ENV: 'production', BETTER_AUTH_SECRET: 'x'.repeat(32) }

  it('refuses the seed passwords from .env.example', () => {
    expect(() => loadConfig({ ...base, SEED_ADMIN_PASSWORD: 'admin-password', SEED_DEMO_PASSWORD: 'long-enough-2' })).toThrow(
      /SEED_ADMIN_PASSWORD/,
    )
    expect(() => loadConfig({ ...base, SEED_ADMIN_PASSWORD: 'long-enough-1', SEED_DEMO_PASSWORD: 'demo-password' })).toThrow(
      /SEED_DEMO_PASSWORD/,
    )
    // Even one of them alone (the seed would be off, but the file was copied as is).
    expect(() => loadConfig({ ...base, SEED_ADMIN_PASSWORD: 'admin-password' })).toThrow(/SEED_ADMIN_PASSWORD/)
  })

  it('refuses the development fallback secret', () => {
    const devSecret = loadConfig({}).secret
    expect(() => loadConfig({ NODE_ENV: 'production', BETTER_AUTH_SECRET: devSecret })).toThrow(/BETTER_AUTH_SECRET/)
  })

  it('development still accepts the .env.example values', () => {
    expect(loadConfig({ SEED_ADMIN_PASSWORD: 'admin-password', SEED_DEMO_PASSWORD: 'demo-password' }).seed.enabled).toBe(true)
  })
})

describe('loadConfig dev mail', () => {
  it('is on only for a local APP_URL outside production', () => {
    expect(loadConfig({}).devMail).toBe(true)
    expect(loadConfig({ APP_URL: 'http://127.0.0.1:5180' }).devMail).toBe(true)
    // A deploy that forgot NODE_ENV=production must not publish reset links.
    expect(loadConfig({ APP_URL: 'https://vpn.example.com' }).devMail).toBe(false)
    expect(loadConfig({ APP_URL: 'http://localhost.example.com' }).devMail).toBe(false)
    expect(loadConfig({ NODE_ENV: 'production', BETTER_AUTH_SECRET: 'x'.repeat(32) }).devMail).toBe(false)
  })
})
