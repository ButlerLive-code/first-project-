import { useContext } from 'react'
import { LocaleContext } from './context'

export function useT() {
  return useContext(LocaleContext).t
}
