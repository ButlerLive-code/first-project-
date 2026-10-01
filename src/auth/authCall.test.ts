import { expect, it } from 'vitest'
import { authCall } from './authCall'

it('returns data on success', async () => {
  expect(await authCall(async () => ({ data: { ok: 1 }, error: null }))).toEqual({ ok: 1 })
})

it('maps the rewritten error body to an ApiError', async () => {
  const call = async () => ({ data: null, error: { status: 401, statusText: 'Unauthorized', error: { code: 'invalid_credentials' } } })
  await expect(authCall(call)).rejects.toMatchObject({ code: 'invalid_credentials', status: 401 })
})

it('a thrown call or a better-fetch fetch error is network', async () => {
  await expect(
    authCall(async () => {
      throw new TypeError('Failed to fetch')
    }),
  ).rejects.toMatchObject({ code: 'network' })
  await expect(authCall(async () => ({ data: null, error: { status: 500, statusText: 'Fetch Error' } }))).rejects.toMatchObject({
    code: 'network',
  })
})
