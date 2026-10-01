// A readable label for a session's user agent: "Chrome · macOS".
// Browser and OS names are product names and stay in English.
const browsers: [RegExp, string][] = [
  [/Edg\//, 'Edge'],
  [/OPR\//, 'Opera'],
  [/Firefox\//, 'Firefox'],
  [/Chrome\//, 'Chrome'],
  [/Safari\//, 'Safari'],
]

const systems: [RegExp, string][] = [
  [/iPhone|iPad/, 'iOS'],
  [/Android/, 'Android'],
  [/Windows/, 'Windows'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/Linux/, 'Linux'],
]

export function describeAgent(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null
  const browser = browsers.find(([re]) => re.test(userAgent))?.[1]
  const system = systems.find(([re]) => re.test(userAgent))?.[1]
  const parts = [browser, system].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}
