import type { ReactNode } from 'react'

interface Props {
  eyebrow: string
  title: string
  children?: ReactNode
}

export function PageHeader({ eyebrow, title, children }: Props) {
  return (
    <header className="page-header container">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="page-title">{title}</h1>
      {children && <div className="page-lead">{children}</div>}
    </header>
  )
}
