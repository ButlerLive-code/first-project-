import { expect, it } from 'vitest'
import { scanSource } from './i18n-scan.mjs'

const texts = (code) => scanSource(code).map((f) => f.text)

it('finds visible English text', () => {
  const code = [
    'function X() {',
    '  return (',
    '    <>',
    '      <h1 className="x">Welcome back</h1>',
    '      <input placeholder="you@example.com" />',
    '      <button aria-label="Menu" />',
    '      <p>{t.auth.title}</p>',
    '      <span>LaslesVPN</span> {/* i18n-ignore */}',
    '      <p>{count} · {total}</p>',
    '    </>',
    '  )',
    '}',
    'const ok = a > b && c < d',
    'const links = [',
    "  { label: 'About', to: '/#about' },",
    "  { label: 'Brand', to: '/' }, // i18n-ignore",
    ']',
  ].join('\n')
  expect(texts(code)).toEqual(['Welcome back', 'you@example.com', 'Menu', 'About'])
})

it('finds text on its own line between tags', () => {
  const result = scanSource('<button>\n  Sign In\n</button>')
  expect(result).toEqual([{ line: 2, text: 'Sign In' }])
})

it('finds text next to template expressions', () => {
  expect(texts('<h1>Hi, {name}!</h1>')).toEqual(['Hi,'])
})

it('preserves text with ampersands', () => {
  expect(texts('<p>Terms & Conditions</p>')).toEqual(['Terms & Conditions'])
})

it('skips code and generics', () => {
  expect(scanSource("const x = useState<Billing>(user?.billing ?? 'monthly')")).toEqual([])
})

it('finds text after an element whose attributes contain arrow functions', () => {
  expect(scanSource('<a onClick={() => setX(true)}>\n  Forgot password?\n</a>')).toEqual([
    { line: 2, text: 'Forgot password?' },
  ])
})

it('finds text after attributes with template literals', () => {
  expect(texts('<Link to={`/x?y=${encodeURIComponent(n)}`}>Create an account</Link>')).toEqual(['Create an account'])
})

it('keeps prose containing code-like words and symbols', () => {
  const t = 'Choose a plan from the list; export your data = easy'
  expect(texts(`<p>${t}</p>`)).toEqual([t])
})

it('reports user-facing attributes only', () => {
  expect(texts('<input placeholder={\'Search\'} aria-label="Find" className="search-box" />')).toEqual(['Search', 'Find'])
})

it('reports string literals in JSX expressions', () => {
  expect(texts("<p>{'Hello'}</p>")).toEqual(['Hello'])
})

it('honours i18n-ignore in JSX comments on the same line', () => {
  expect(texts('<p>Hello</p> {/* i18n-ignore */}')).toEqual([])
})

it('reports strings in conditional and logical JSX expressions', () => {
  expect(texts("<p>{isFree ? 'Free forever' : 'Billed monthly'}</p>")).toEqual(['Free forever', 'Billed monthly'])
  expect(texts("<p>{error || 'Something went wrong'}</p>")).toEqual(['Something went wrong'])
  expect(texts("<p>{ok && 'Done'}</p>")).toEqual(['Done'])
  expect(texts("<p>{x ?? 'Fallback text'}</p>")).toEqual(['Fallback text'])
  expect(texts("<p>{(s.premium ? 'Premium' : 'Free')}</p>")).toEqual(['Premium', 'Free'])
  expect(texts("<a title={x ? 'A b' : 'C d'} />")).toEqual(['A b', 'C d'])
})

it('does not report condition operands', () => {
  expect(texts("<p>{plan === 'standard' ? <b>Popular</b> : null}</p>")).toEqual(['Popular'])
})

it('reports static parts of template expressions', () => {
  expect(texts('<p>{`Hello ${name}, welcome`}</p>')).toEqual(['Hello', ', welcome'])
})
