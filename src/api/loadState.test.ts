import { describe, expect, it } from 'vitest'
import { ApiError } from './client'
import { createRequests, initialState, view, withClear, withData, withError } from './loadState'

describe('loadState', () => {
  it('A -> null -> A starts loading with no data', () => {
    let state = withData(initialState<string>(), '/a', 'user one')
    expect(view(state, '/a').data).toBe('user one')
    state = withClear<string>()
    expect(view(state, null).data).toBeUndefined()
    const again = view(state, '/a')
    expect(again.data).toBeUndefined()
    expect(again.error).toBeUndefined()
    expect(again.loading).toBe(true)
  })

  it('data for another path is never shown', () => {
    const state = withData(initialState<string>(), '/a', 'x')
    expect(view(state, '/b')).toMatchObject({ data: undefined, loading: true })
  })

  it('shows errors and stops loading', () => {
    const state = withError(initialState<string>(), '/a', new ApiError('network', 0))
    expect(view(state, '/a')).toMatchObject({ loading: false, error: { code: 'network' } })
  })
})

describe('createRequests', () => {
  it('a response from before setData (invalidate) is ignored', () => {
    const requests = createRequests()
    const token = requests.begin()
    expect(requests.isCurrent(token)).toBe(true)
    requests.invalidate() // setData
    expect(requests.isCurrent(token)).toBe(false)
  })

  it('a response for an older request (old path) is ignored', () => {
    const requests = createRequests()
    const a = requests.begin()
    const b = requests.begin()
    expect(requests.isCurrent(a)).toBe(false)
    expect(requests.isCurrent(b)).toBe(true)
  })

  it('reload starts a new current request and drops the previous one', () => {
    const requests = createRequests()
    const first = requests.begin()
    const second = requests.begin()
    expect(requests.isCurrent(first)).toBe(false)
    expect(requests.isCurrent(second)).toBe(true)
  })
})
