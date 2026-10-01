import { useLocation } from 'react-router'
import { LocalNavigate } from '../i18n/LocalLink'
import { useT } from '../i18n/useT'
import type { ApiError } from './client'
import { errorMessage } from './errorMessage'

// What a page shows instead of its data: a loading line, a sign-in redirect
// on 401, or the error with a Retry button.
export function ApiState({ error, onRetry }: { error?: ApiError; onRetry?: () => void }) {
  const t = useT()
  const location = useLocation()

  if (!error) {
    return (
      <p className="form-note" role="status">
        {t.common.loading}
      </p>
    )
  }
  if (error.code === 'unauthorized') {
    const next = location.pathname + location.search
    return <LocalNavigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }
  return (
    <div className="notice" role="alert">
      <p>{errorMessage(t, error)}</p>
      {onRetry && (
        <button type="button" className="btn btn-outline" onClick={onRetry}>
          {t.common.retry}
        </button>
      )}
    </div>
  )
}
