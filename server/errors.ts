import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type * as z from 'zod'
import type { ErrorBody, ErrorCode } from '../shared/api.ts'

// Thrown by route handlers; app.onError turns it into { error: { code } }.
export class AppError extends Error {
  readonly code: ErrorCode
  readonly status: ContentfulStatusCode

  constructor(code: ErrorCode, status: ContentfulStatusCode) {
    super(code)
    this.code = code
    this.status = status
  }
}

export function errorBody(code: ErrorCode): ErrorBody {
  return { error: { code } }
}

export function errorResponse(c: Context, code: ErrorCode, status: ContentfulStatusCode) {
  return c.json(errorBody(code), status)
}

// Parses a JSON body with a zod schema; any problem is a 400 validation_failed.
export async function readBody<T extends z.ZodType>(c: Context, schema: T): Promise<z.infer<T>> {
  let raw: unknown
  try {
    raw = await c.req.json()
  } catch {
    throw new AppError('validation_failed', 400)
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) throw new AppError('validation_failed', 400)
  return parsed.data
}
