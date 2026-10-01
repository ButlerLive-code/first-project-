import { useEffect } from 'react'
import { useLocation } from 'react-router'

// Scrolls to `#hash` targets after navigation (including from other pages)
// and resets to the top on plain route changes.
export function ScrollManager() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }
    const frame = requestAnimationFrame(() => {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(frame)
  }, [pathname, hash])

  return null
}
