import { expect, it } from 'vitest'
import { en } from './en'
import { plural } from './plural'
import { ru } from './ru'

const device = { one: 'устройство', few: 'устройства', many: 'устройств', other: 'устройства' }

it.each([
  [0, 'устройств'],
  [1, 'устройство'],
  [2, 'устройства'],
  [5, 'устройств'],
  [11, 'устройств'],
  [21, 'устройство'],
  [22, 'устройства'],
  [25, 'устройств'],
  [1.5, 'устройства'],
])('ru %d → %s', (n, form) => {
  expect(plural('ru', n, device)).toBe(form)
})

it('en uses one/other', () => {
  const forms = { one: 'device', other: 'devices' }
  expect(plural('en', 1, forms)).toBe('device')
  expect(plural('en', 0, forms)).toBe('devices')
  expect(plural('en', 3, forms)).toBe('devices')
})

it('device counters read naturally', () => {
  expect(ru.devices.count(1)).toBe('1 устройство')
  expect(ru.devices.count(3)).toBe('3 устройства')
  expect(ru.devices.count(5)).toBe('5 устройств')
  expect(en.devices.count(1)).toBe('1 device')
  expect(en.devices.count(3)).toBe('3 devices')
})
