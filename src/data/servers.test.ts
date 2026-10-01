import { expect, it } from 'vitest'
import { en } from '../i18n/en'
import { ru } from '../i18n/ru'
import { countries, matchesQuery, placeName, regions, servers } from './servers'
import { ruPlaceNames } from './servers.ru'

it('every country and city has a Russian name', () => {
  const names = new Set([...servers.map((s) => s.country), ...servers.map((s) => s.city)])
  const missing = [...names].filter((n) => !ruPlaceNames[n])
  expect(missing).toEqual([])
})

it('no stale Russian names', () => {
  const names = new Set([...servers.map((s) => s.country), ...servers.map((s) => s.city)])
  expect(Object.keys(ruPlaceNames).filter((n) => !names.has(n))).toEqual([])
})

it('every region has a label in both languages', () => {
  for (const region of regions) {
    expect(en.regions[region]).toBeTruthy()
    expect(ru.regions[region]).toBeTruthy()
  }
})

it('placeName and search work in both languages', () => {
  const germany = countries.find((c) => c.slug === 'germany')!
  expect(placeName(germany.name, 'ru')).toBe('Германия')
  expect(placeName(germany.name, 'en')).toBe('Germany')
  const berlin = servers.find((s) => s.city === 'Berlin')!
  expect(matchesQuery(berlin, 'germ')).toBe(true)
  expect(matchesQuery(berlin, 'ГЕРМ')).toBe(true)
  expect(matchesQuery(berlin, 'берл')).toBe(true)
  expect(matchesQuery(berlin, 'франц')).toBe(false)
})
