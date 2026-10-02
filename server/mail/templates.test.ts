import { describe, expect, it } from 'vitest'
import { renderMail, siteLink } from './templates.ts'

describe('siteLink', () => {
  it('points at the site page in the user language', () => {
    expect(siteLink('http://localhost:5173', 'en', '/verify-email', { token: 'a.b' })).toBe(
      'http://localhost:5173/verify-email?token=a.b',
    )
    expect(siteLink('http://localhost:5173', 'ru', '/reset-password', { token: 't', email: 'a+b@c.d' })).toBe(
      'http://localhost:5173/ru/reset-password?token=t&email=a%2Bb%40c.d',
    )
  })
})

describe('renderMail', () => {
  const data = { to: 'ann@example.com', name: 'Ann <b>', url: 'http://localhost:5173/verify-email?token=x&y=1' }

  it('writes English and Russian versions of every mail', () => {
    for (const kind of ['verifyEmail', 'resetPassword', 'changeEmail'] as const) {
      const en = renderMail(kind, 'en', data)
      const ru = renderMail(kind, 'ru', data)
      expect(en.to).toBe('ann@example.com')
      expect(en.subject).toMatch(/LaslesVPN/)
      expect(ru.subject).toMatch(/[а-яё]/i)
      expect(ru.subject).not.toBe(en.subject)
      expect(en.text).toContain(data.url)
      expect(ru.text).toContain(data.url)
    }
  })

  it('greets by name and escapes it in HTML', () => {
    const mail = renderMail('verifyEmail', 'ru', data)
    expect(mail.text).toContain('Здравствуйте, Ann <b>!')
    expect(mail.html).toContain('Ann &#60;b&#62;')
    expect(mail.html).toContain('href="http://localhost:5173/verify-email?token=x&#38;y=1"')
  })
})
