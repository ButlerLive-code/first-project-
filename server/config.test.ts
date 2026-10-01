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
