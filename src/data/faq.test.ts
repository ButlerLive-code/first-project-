import { expect, it } from 'vitest'
import { getFaq } from './faq'

it('Russian FAQ mirrors the English one', () => {
  const en = getFaq('en')
  const ru = getFaq('ru')
  expect(ru.map((c) => c.items.length)).toEqual(en.map((c) => c.items.length))
  ru.forEach((c, i) =>
    c.items.forEach((item, j) => {
      expect(item.link?.to).toBe(en[i].items[j].link?.to)
      expect(item.q).not.toBe(en[i].items[j].q)
    }),
  )
})
