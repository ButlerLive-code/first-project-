// Where to go after signing in or up. Only in-app paths are accepted, so a
// crafted ?next= link cannot send the visitor to another site. Control
// characters are rejected too: browsers strip tab/CR/LF, so "/\t/evil.com"
// would otherwise turn into "//evil.com".
export function safeNext(next: string | null, fallback = '/dashboard') {
  // eslint-disable-next-line no-control-regex -- control characters are the point
  if (!next || /[\u0000-\u001F\\]/.test(next)) return fallback
  return next.startsWith('/') && !next.startsWith('//') ? next : fallback
}
