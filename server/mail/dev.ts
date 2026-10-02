import type { Db } from '../db/client.ts'
import { devMail } from '../db/schema.ts'
import type { Mailer } from './types.ts'

// Development mailer: nothing leaves the machine. Messages are stored in
// dev_mail (shown at /dev/mail) and printed to the console.
export function createDevMailer(db: Db, log: (line: string) => void = console.log): Mailer {
  return {
    async send(message) {
      await db.insert(devMail).values(message)
      log(`[mail] to ${message.to}: ${message.subject}\n${message.text}\n`)
    },
  }
}
