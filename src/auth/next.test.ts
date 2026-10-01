import { expect, it } from 'vitest'
import { localize } from '../i18n/locales'
import { safeNext } from './next'

it.each([
  [null, '/dashboard'],
  ['', '/dashboard'],
  ['/checkout?plan=premium', '/checkout?plan=premium'],
  ['/ru/checkout', '/ru/checkout'],
  ['//evil.com', '/dashboard'],
  ['/\\evil.com', '/dashboard'],
  ['/\t/evil.com', '/dashboard'],
  ['/\n/evil.com', '/dashboard'],
  ['/\r\n/evil.com', '/dashboard'],
  // Already decoded by params.get, so this is literal text and a harmless path.
  ['/%09/evil.com', '/%09/evil.com'],
  ['/a\\b', '/dashboard'],
  ['https://evil.com', '/dashboard'],
  ['javascript:alert(1)', '/dashboard'],
])('safeNext(%s) → %s', (next, expected) => {
  expect(safeNext(next)).toBe(expected)
})

it('a Russian next followed from the English login lands on the English page', () => {
  expect(localize(safeNext('/ru/checkout?plan=premium'), 'en')).toBe('/checkout?plan=premium')
  expect(localize(safeNext('/checkout'), 'ru')).toBe('/ru/checkout')
})
