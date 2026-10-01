import { expect, it } from 'vitest'
import { scanSource } from './i18n-scan.mjs'

it('finds visible English text', () => {
  const code = [
    '<h1 className="x">Welcome back</h1>',
    '<input placeholder="you@example.com" />',
    '<button aria-label="Menu">',
    "  { label: 'About', to: '/#about' },",
    '<p>{t.auth.title}</p>',
    '<span>LaslesVPN</span> // i18n-ignore',
    'const ok = a > b && c < d',
    '<p>{count} · {total}</p>',
  ].join('\n')
  expect(scanSource(code).map((f) => f.text)).toEqual(['Welcome back', 'you@example.com', 'Menu', 'About'])
})
