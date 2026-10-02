import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createTestApp, json, type TestApp } from './test/helpers.ts'

let t: TestApp
beforeAll(async () => {
  t = await createTestApp()
  // A route that crashes, to see what the browser gets.
  t.app.get('/api/__boom', () => {
    throw new Error('secret detail')
  })
})
afterAll(async () => {
  await t.close()
})

describe('app', () => {
  it('/api/config tells the site which optional features are on', async () => {
    expect(await json(await t.call('/api/config'))).toEqual({ googleEnabled: false, devMail: true })
  })

  it('unknown API paths are not_found', async () => {
    const res = await t.call('/api/nope')
    expect(res.status).toBe(404)
    expect(await json(res)).toEqual({ error: { code: 'not_found' } })
  })

  it('a crash is a bare server_error, without details', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await t.call('/api/__boom')
    expect(res.status).toBe(500)
    expect(await json(res)).toEqual({ error: { code: 'server_error' } })
    spy.mockRestore()
  })
})
