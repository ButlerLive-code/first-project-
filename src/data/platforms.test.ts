import { expect, it } from 'vitest'
import { getPlatforms } from './platforms'

it('Russian tutorials have the same shape as English ones', () => {
  const en = getPlatforms('en')
  const ru = getPlatforms('ru')
  expect(ru.map((p) => p.id)).toEqual(en.map((p) => p.id))
  ru.forEach((p, i) => {
    expect(p.steps).toHaveLength(en[i].steps.length)
    expect(p.troubleshooting).toHaveLength(en[i].troubleshooting.length)
    expect(p.requirements).not.toBe(en[i].requirements)
  })
})
