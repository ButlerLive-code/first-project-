import { expect, it } from 'vitest'
import { clearLegacyStorage } from './legacy'

it('removes both demo keys and keeps the language choice', () => {
  const data = new Map([
    ['laslesvpn.session', '{}'],
    ['laslesvpn.accounts', '{}'],
    ['laslesvpn.locale', 'ru'],
  ])
  clearLegacyStorage(() => ({ removeItem: (key: string) => void data.delete(key) }))
  expect([...data.keys()]).toEqual(['laslesvpn.locale'])
})

it('survives storage that cannot be opened or written', () => {
  expect(() =>
    clearLegacyStorage(() => {
      throw new Error('SecurityError')
    }),
  ).not.toThrow()
  expect(() =>
    clearLegacyStorage(() => ({
      removeItem: () => {
        throw new Error('SecurityError')
      },
    })),
  ).not.toThrow()
})
