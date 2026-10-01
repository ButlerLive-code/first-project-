export function LoadBar({ load }: { load: number }) {
  const level = load >= 65 ? 'high' : load >= 45 ? 'mid' : 'low'
  return (
    <span className="load" title={`${load}% load`}>
      <span className={`load-bar load-${level}`}>
        <span style={{ width: `${load}%` }} />
      </span>
      {load}%
    </span>
  )
}
