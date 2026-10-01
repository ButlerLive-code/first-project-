import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiFetch, errorFromBody } from './client'

function mockFetch(impl: () => Promise<Response>) {
  const fn = vi.fn(impl)
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiFetch', () => {
  it('sends JSON with the session cookie and returns the parsed body', async () => {
    const fetch = mockFetch(async () => Response.json({ ok: true }))
    expect(await apiFetch('/api/me', { method: 'PATCH', body: { name: 'A' } })).toEqual({ ok: true })
    expect(fetch).toHaveBeenCalledWith('/api/me', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{"name":"A"}',
    })
  })

  it('returns undefined for 204', async () => {
    mockFetch(async () => new Response(null, { status: 204 }))
    expect(await apiFetch('/api/me/devices/x', { method: 'DELETE' })).toBeUndefined()
  })

  it('turns { error: { code } } into an ApiError with that code and status', async () => {
    mockFetch(async () => Response.json({ error: { code: 'device_limit' } }, { status: 409 }))
    await expect(apiFetch('/api/me/devices', { method: 'POST', body: {} })).rejects.toMatchObject({
      code: 'device_limit',
      status: 409,
    })
  })

  it('an unknown code or a non-JSON body is server_error', async () => {
    mockFetch(async () => Response.json({ error: { code: 'teapot' } }, { status: 418 }))
    await expect(apiFetch('/api/x')).rejects.toMatchObject({ code: 'server_error', status: 418 })
    mockFetch(async () => new Response('<html>Bad gateway</html>', { status: 502 }))
    await expect(apiFetch('/api/x')).rejects.toMatchObject({ code: 'server_error', status: 502 })
  })

  it('a failed connection is network', async () => {
    mockFetch(async () => {
      throw new TypeError('Failed to fetch')
    })
    const error = await apiFetch('/api/me').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ code: 'network', status: 0 })
  })
})

it('errorFromBody tolerates any shape', () => {
  expect(errorFromBody(401, { error: { code: 'unauthorized' } }).code).toBe('unauthorized')
  expect(errorFromBody(500, null).code).toBe('server_error')
  expect(errorFromBody(400, 'text').code).toBe('server_error')
})
