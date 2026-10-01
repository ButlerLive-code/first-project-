import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { assertSafeDataDir } from './safe-data-dir.ts'

const root = resolve('/work/laslesvpn')

describe('assertSafeDataDir', () => {
  it('allows the default dir and nested paths inside the project', () => {
    expect(assertSafeDataDir('.data/pglite', root, {}, root)).toBe(resolve(root, '.data/pglite'))
    expect(assertSafeDataDir(resolve(root, 'tmp/a/b'), root, {}, root)).toBe(resolve(root, 'tmp/a/b'))
  })

  it.each(['/', '.', '..', homedir(), root, '/work/other', '/work/laslesvpn-evil', '../sibling', ''])(
    'refuses %j',
    (dir) => {
      expect(() => assertSafeDataDir(dir, root, {}, root)).toThrow(/refus/i)
    },
  )

  it('refuses in production even for a safe path', () => {
    expect(() => assertSafeDataDir('.data/pglite', root, { NODE_ENV: 'production' }, root)).toThrow(/production/)
  })
})
