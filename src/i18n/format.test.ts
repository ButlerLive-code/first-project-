import { describe, expect, it } from 'vitest'
import { formatDate, formatMonthYear, formatNumber, formatPrice } from './format'

// Intl separates groups and currency with (narrow) no-break spaces.
const plain = (s: string) => s.replace(/\s/g, ' ')

describe('formatDate', () => {
  it('formats date-only strings the same in every time zone', () => {
    expect(formatDate('2026-09-18', 'en')).toBe('September 18, 2026')
    expect(formatDate('2026-09-18', 'ru')).toBe('18 сентября 2026 г.')
    expect(formatDate('2026-01-01', 'en', 'short')).toBe('Jan 1, 2026')
  })

  it('formats full timestamps', () => {
    expect(formatDate('2026-09-18T12:00:00.000Z', 'en', 'short')).toBe('Sep 18, 2026')
  })
})

it('formatMonthYear', () => {
  expect(formatMonthYear('2026-09-18T12:00:00.000Z', 'en')).toBe('Sep 2026')
  expect(plain(formatMonthYear('2026-09-18T12:00:00.000Z', 'ru'))).toBe('сент. 2026 г.')
})

it('formatNumber', () => {
  expect(formatNumber(12345, 'en')).toBe('12,345')
  expect(plain(formatNumber(12345, 'ru'))).toBe('12 345')
})

it('formatPrice', () => {
  expect(formatPrice(9, 'en')).toBe('$9')
  expect(formatPrice(90, 'en')).toBe('$90')
  expect(formatPrice(9.5, 'en')).toBe('$9.50')
  expect(plain(formatPrice(9, 'ru'))).toBe('9 $')
  expect(plain(formatPrice(9.5, 'ru'))).toBe('9,50 $')
})
