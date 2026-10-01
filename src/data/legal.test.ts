import { expect, it } from 'vitest'
import { getLegal } from './legal'

it.each(['privacy', 'terms'] as const)('%s has the same sections in both languages', (doc) => {
  const en = getLegal(doc, 'en')
  const ru = getLegal(doc, 'ru')
  expect(ru.updated).toBe(en.updated)
  expect(ru.sections.map((s) => s.id)).toEqual(en.sections.map((s) => s.id))
  expect(ru.sections.map((s) => s.paragraphs.length)).toEqual(en.sections.map((s) => s.paragraphs.length))
})
