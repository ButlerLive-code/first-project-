import { useContext } from 'react'
import { LocaleContext } from './context'

import type { Dictionary } from './en'

// A message kept in state as a selector, so it is rendered with the current
// language and follows an EN/RU switch. Set it with setX(message((t) => t.…)).
export type Message = ((t: Dictionary) => string) | null

// Wraps a selector as a state updater, so React stores it instead of calling it.
export const message = (pick: (t: Dictionary) => string) => (): Message => pick

export function useT() {
  return useContext(LocaleContext).t
}
