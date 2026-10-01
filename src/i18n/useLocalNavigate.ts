import { useCallback } from 'react'
import { useNavigate, type NavigateOptions } from 'react-router'
import { localize } from './locales'
import { useLocale } from './useLocale'

export function useLocalNavigate() {
  const navigate = useNavigate()
  const locale = useLocale()
  return useCallback(
    (to: string, options?: NavigateOptions) => navigate(localize(to, locale), options),
    [navigate, locale],
  )
}
