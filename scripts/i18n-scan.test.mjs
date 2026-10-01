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

it('finds text on its own line between tags', () => {
  const code = '<button>\n  Sign In\n</button>'
  const result = scanSource(code)
  expect(result.map((f) => f.text)).toEqual(['Sign In'])
  expect(result[0].line).toBe(2)
})

it('finds text next to template expressions', () => {
  const code = '<h1>Hi, {name}!</h1>'
  const result = scanSource(code)
  expect(result.map((f) => f.text)).toEqual(['Hi,'])
})

it('preserves text with ampersands and parentheses', () => {
  const code = '<p>Terms & Conditions</p>'
  const result = scanSource(code)
  expect(result.map((f) => f.text)).toEqual(['Terms & Conditions'])
})

it('skips code patterns and generics', () => {
  const code = 'const x = useState<Billing>(user?.billing ?? \'monthly\')'
  const result = scanSource(code)
  expect(result).toEqual([])
})
