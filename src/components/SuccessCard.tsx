import type { ReactNode } from 'react'

interface Props {
  title: string
  children: ReactNode
  onReset?: () => void
  resetLabel?: string
}

export function SuccessCard({ title, children, onReset, resetLabel = 'Send another' }: Props) {
  return (
    <div className="card success-card" role="status">
      <span className="success-icon" aria-hidden="true">
        ✓
      </span>
      <h3 className="card-title">{title}</h3>
      <div>{children}</div>
      {onReset && (
        <button type="button" className="link-button" onClick={onReset}>
          {resetLabel}
        </button>
      )}
    </div>
  )
}
