import { useT } from '../i18n/useT'

export function LoadBar({ load }: { load: number }) {
  const t = useT()
  const level = load >= 65 ? 'high' : load >= 45 ? 'mid' : 'low'
  return (
    <span className="load" title={t.loadBar.title(load)}>
      <span className={`load-bar load-${level}`}>
        <span style={{ width: `${load}%` }} />
      </span>
      {load}%
    </span>
  )
}
