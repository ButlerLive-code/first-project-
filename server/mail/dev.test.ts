import { afterAll, beforeAll, expect, it } from 'vitest'
import { openDatabase, type Database } from '../db/client.ts'
import { devMail } from '../db/schema.ts'
import { createDevMailer } from './dev.ts'

let database: Database
beforeAll(async () => {
  database = await openDatabase()
})
afterAll(async () => {
  await database.close()
})

it('stores the mail in dev_mail and prints it', async () => {
  const lines: string[] = []
  const mailer = createDevMailer(database.db, (line) => lines.push(line))
  await mailer.send({ to: 'a@example.com', subject: 'Hi', text: 'Body http://x', html: '<p>Body</p>' })

  const rows = await database.db.select().from(devMail)
  expect(rows).toHaveLength(1)
  expect(rows[0]).toMatchObject({ to: 'a@example.com', subject: 'Hi', text: 'Body http://x', html: '<p>Body</p>' })
  expect(lines.join('\n')).toContain('a@example.com')
  expect(lines.join('\n')).toContain('Body http://x')
})
