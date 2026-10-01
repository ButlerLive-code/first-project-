import { expect, it } from 'vitest'
import { plural } from './plural'

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
