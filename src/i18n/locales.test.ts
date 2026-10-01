import { describe, expect, it } from 'vitest'
import { initialRedirect, isLocale, localize, stripLocale } from './locales'

describe('stripLocale', () => {
  it.each([
    ['/', 'en', '/'],
    ['/blog/x', 'en', '/blog/x'],
    ['/ru', 'ru', '/'],
    ['/ru/', 'ru', '/'],
    ['/ru/blog/x', 'ru', '/blog/x'],
    ['/russia', 'en', '/russia'],
    ['/rules', 'en', '/rules'],
    ['/ru-blog', 'en', '/ru-blog'],
  ])('%s → %s %s', (pathname, locale, path) => {
    expect(stripLocale(pathname)).toEqual({ locale, path })
  })
})

describe('localize', () => {
  it.each([
    ['/', 'ru', '/ru'],
    ['/blog', 'ru', '/ru/blog'],
    ['/#pricing', 'ru', '/ru#pricing'],
    ['/?a=1', 'ru', '/ru?a=1'],
    ['/servers?region=europe#list', 'ru', '/ru/servers?region=europe#list'],
    ['/dashboard?welcome=1', 'ru', '/ru/dashboard?welcome=1'],
    ['/blog', 'en', '/blog'],
    ['/ru/blog?x=1', 'en', '/blog?x=1'],
    ['/ru', 'en', '/'],
    ['/ru#pricing', 'en', '/#pricing'],
    ['/russia', 'ru', '/ru/russia'],
  ])('%s in %s → %s', (to, locale, expected) => {
    expect(localize(to, locale as 'en' | 'ru')).toBe(expected)
  })

  it('is idempotent', () => {
    for (const to of ['/', '/blog/x?y=1#z', '/#pricing']) {
      const once = localize(to, 'ru')
      expect(localize(once, 'ru')).toBe(once)
    }
  })

  it.each(['devices', '../x', '#top', '?q=1', 'https://example.com', '//evil.com', 'mailto:a@b.c'])(
    'leaves %s untouched',
    (to) => {
      expect(localize(to, 'ru')).toBe(to)
    },
  )
})

describe('initialRedirect', () => {
  const root = { pathname: '/', search: '', hash: '' }

  it('sends a returning Russian visitor from the root to /ru', () => {
    expect(initialRedirect(root, 'ru')).toBe('/ru')
    expect(initialRedirect({ pathname: '/', search: '?a=1', hash: '#pricing' }, 'ru')).toBe('/ru?a=1#pricing')
  })

  it('does nothing elsewhere or without a stored choice', () => {
    expect(initialRedirect(root, null)).toBeNull()
    expect(initialRedirect(root, 'en')).toBeNull()
    expect(initialRedirect({ pathname: '/blog', search: '', hash: '' }, 'ru')).toBeNull()
    expect(initialRedirect({ pathname: '/ru', search: '', hash: '' }, 'ru')).toBeNull()
  })
})

it('isLocale', () => {
  expect(isLocale('ru')).toBe(true)
  expect(isLocale('de')).toBe(false)
  expect(isLocale(null)).toBe(false)
})
