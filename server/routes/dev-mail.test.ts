import { afterAll, beforeAll, expect, it } from 'vitest'
import type { DevMail } from '../../shared/api.ts'
import { createTestApp, json, type TestApp } from '../test/helpers.ts'

let t: TestApp
beforeAll(async () => {
  t = await createTestApp()
})
afterAll(async () => {
  await t.close()
})

it('lists captured mail, newest first', async () => {
  await t.mailer.send({ to: 'a@example.com', subject: 'First', text: 'one', html: '<p>one</p>' })
  await t.mailer.send({ to: 'b@example.com', subject: 'Second', text: 'two', html: '<p>two</p>' })
  const mails = await json<DevMail[]>(await t.call('/api/dev/mail'))
  expect(mails.map((m) => m.subject)).toEqual(['Second', 'First'])
  expect(mails[0]).toMatchObject({ to: 'b@example.com', text: 'two', html: '<p>two</p>' })
  expect(Date.parse(mails[0].createdAt)).not.toBeNaN()
})

it('does not exist in production', async () => {
  const prod = await createTestApp({ env: { NODE_ENV: 'production', BETTER_AUTH_SECRET: 'p'.repeat(32) } })
  try {
    const res = await prod.call('/api/dev/mail')
    expect(res.status).toBe(404)
    expect(await json(await prod.call('/api/config'))).toEqual({ googleEnabled: false, devMail: false })
  } finally {
    await prod.close()
  }
})
