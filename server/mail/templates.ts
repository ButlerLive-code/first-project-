import type { UserLocale } from '../../shared/api.ts'
import type { MailMessage } from './types.ts'

export type MailKind = 'verifyEmail' | 'resetPassword' | 'changeEmail'

interface Copy {
  subject: string
  greeting: (name: string) => string
  body: string
  button: string
  ignore: string
}

// Plain templates, one per message, in both site languages.
const copy: Record<UserLocale, Record<MailKind, Copy>> = {
  en: {
    verifyEmail: {
      subject: 'Confirm your email for LaslesVPN',
      greeting: (name) => `Hi ${name},`,
      body: 'Please confirm your email address to finish setting up your LaslesVPN account.',
      button: 'Confirm email',
      ignore: "If you didn't create an account, you can ignore this email.",
    },
    resetPassword: {
      subject: 'Reset your LaslesVPN password',
      greeting: (name) => `Hi ${name},`,
      body: 'Someone asked to reset the password for your LaslesVPN account. The link works once and expires in 1 hour.',
      button: 'Choose a new password',
      ignore: "If it wasn't you, ignore this email: your password stays the same.",
    },
    changeEmail: {
      subject: 'Confirm your new email for LaslesVPN',
      greeting: (name) => `Hi ${name},`,
      body: 'Confirm this address to make it the new email for your LaslesVPN account.',
      button: 'Confirm new email',
      ignore: "If you didn't ask for this change, ignore this email: your account keeps its current address.",
    },
  },
  ru: {
    verifyEmail: {
      subject: 'Подтвердите email для LaslesVPN',
      greeting: (name) => `Здравствуйте, ${name}!`,
      body: 'Подтвердите адрес электронной почты, чтобы завершить настройку аккаунта LaslesVPN.',
      button: 'Подтвердить email',
      ignore: 'Если вы не создавали аккаунт, просто проигнорируйте это письмо.',
    },
    resetPassword: {
      subject: 'Сброс пароля LaslesVPN',
      greeting: (name) => `Здравствуйте, ${name}!`,
      body: 'Кто-то запросил сброс пароля для вашего аккаунта LaslesVPN. Ссылка одноразовая и действует 1 час.',
      button: 'Придумайте новый пароль',
      ignore: 'Если это были не вы, проигнорируйте письмо: пароль останется прежним.',
    },
    changeEmail: {
      subject: 'Подтвердите новый email для LaslesVPN',
      greeting: (name) => `Здравствуйте, ${name}!`,
      body: 'Подтвердите этот адрес, чтобы он стал новым email вашего аккаунта LaslesVPN.',
      button: 'Подтвердить новый email',
      ignore: 'Если вы не запрашивали смену адреса, проигнорируйте письмо: у аккаунта останется прежний email.',
    },
  },
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`)
}

export function renderMail(
  kind: MailKind,
  locale: UserLocale,
  data: { to: string; name: string; url: string },
): MailMessage {
  const c = copy[locale][kind]
  const text = [c.greeting(data.name), '', c.body, '', `${c.button}: ${data.url}`, '', c.ignore, '', 'LaslesVPN'].join('\n')
  const html = [
    `<p>${escapeHtml(c.greeting(data.name))}</p>`,
    `<p>${escapeHtml(c.body)}</p>`,
    `<p><a href="${escapeHtml(data.url)}">${escapeHtml(c.button)}</a></p>`,
    `<p>${escapeHtml(c.ignore)}</p>`,
    '<p>LaslesVPN</p>',
  ].join('\n')
  return { to: data.to, subject: c.subject, text, html }
}

// Links in emails open the site page in the user's language; the page then
// calls the API with the token.
export function siteLink(appUrl: string, locale: UserLocale, path: string, params: Record<string, string>) {
  const url = new URL((locale === 'ru' ? '/ru' : '') + path, appUrl)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url.toString()
}
