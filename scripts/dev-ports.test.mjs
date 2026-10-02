import { expect, it } from 'vitest'
import { devPorts } from './dev-ports.mjs'

it('runs Vite on the APP_URL port and the API on 3001 by default', () => {
  expect(devPorts({})).toEqual({ web: '5173', api: '3001' })
  expect(devPorts({ APP_URL: 'http://localhost:4000', API_PORT: '4001' })).toEqual({ web: '4000', api: '4001' })
})
