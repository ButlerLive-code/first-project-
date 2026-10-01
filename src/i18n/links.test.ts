import { expect, it } from 'vitest'

const sources = import.meta.glob('/src/**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>

// Only src/i18n may use the router's own links; everything else goes through
// LocalLink / useLocalNavigate so the /ru prefix is never lost.
it('no raw Link, NavLink, Navigate or useNavigate outside src/i18n', () => {
  const offenders = Object.entries(sources)
    .filter(([file]) => !file.startsWith('/src/i18n/'))
    .filter(([, code]) =>
      /import\s*\{[^}]*\b(Link|NavLink|Navigate|useNavigate)\b[^}]*\}\s*from\s*'react-router'/.test(code),
    )
    .map(([file]) => file)
  expect(offenders).toEqual([])
})
