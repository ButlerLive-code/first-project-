import { expect, it } from 'vitest'
import { describeAgent } from './sessions'

it.each([
  [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
    'Chrome · macOS',
  ],
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1', 'Safari · iOS'],
  ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36 Edg/140.0', 'Edge · Windows'],
  ['Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0', 'Firefox · Linux'],
  ['curl/8.0', null],
  [null, null],
])('%s → %s', (ua, label) => {
  expect(describeAgent(ua)).toBe(label)
})
