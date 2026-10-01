import { expect, it } from 'vitest'
import { totpSecret } from './totp'

it('reads and groups the secret of an otpauth URI', () => {
  expect(totpSecret('otpauth://totp/LaslesVPN:a%40b.c?secret=JBSWY3DPEHPK3PXP&issuer=LaslesVPN&digits=6&period=30')).toBe(
    'JBSW Y3DP EHPK 3PXP',
  )
  expect(totpSecret('not a uri')).toBe('')
})
