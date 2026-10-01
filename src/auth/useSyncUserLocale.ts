import { useEffect } from 'react'
import { useLocale } from '../i18n/useLocale'
import { useAuth } from './useAuth'

// Emails go out in user.locale. Whenever a signed-in user browses the site in
// the other language, the account follows the language of the page.
export function useSyncUserLocale() {
  const { user, updateUser } = useAuth()
  const locale = useLocale()
  const stale = user !== null && user.locale !== locale

  useEffect(() => {
    if (!stale) return
    updateUser({ locale }).catch(() => {
      // Not worth bothering the visitor: the next page view tries again.
    })
  }, [stale, locale, updateUser])
}
