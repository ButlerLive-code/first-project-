import { isErrorCode, type ErrorCode } from '../../shared/api'

export type ClientErrorCode = ErrorCode | 'network'

// Every failed API call ends up as an ApiError with one of the spec's codes,
// or 'network' when the server could not be reached at all.
export class ApiError extends Error {
  readonly code: ClientErrorCode
  readonly status: number

  constructor(code: ClientErrorCode, status: number) {
    super(code)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

export function toApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError('server_error', 0)
}

// Reads { error: { code } } from a failed response body; anything else is server_error.
export function errorFromBody(status: number, body: unknown): ApiError {
  const code = (body as { error?: { code?: unknown } } | null)?.error?.code
  return new ApiError(isErrorCode(code) ? code : 'server_error', status)
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
}

export async function apiFetch<T>(path: string, { method = 'GET', body }: ApiOptions = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('network', 0)
  }
  if (res.status === 204) return undefined as T
  let data: unknown = null
  let parsed = true
  try {
    data = await res.json()
  } catch {
    // An empty or non-JSON body: an error status decides below.
    parsed = false
  }
  if (!res.ok) throw errorFromBody(res.status, data)
  if (!parsed) throw new ApiError('server_error', res.status)
  return data as T
}
