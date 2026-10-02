import nodemailer from 'nodemailer'
import type { Config } from '../config.ts'
import type { Mailer } from './types.ts'

export function createSmtpMailer(smtp: NonNullable<Config['smtp']>): Mailer {
  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
  })
  return {
    async send(message) {
      await transport.sendMail({ from: smtp.from, ...message })
    },
  }
}
