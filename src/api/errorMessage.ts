import type { Dictionary } from '../i18n/en'
import { toApiError } from './client'

// The text for any caught error, in the page language.
export function errorMessage(t: Dictionary, error: unknown) {
  return t.errors[toApiError(error).code] ?? t.errors.server_error
}
