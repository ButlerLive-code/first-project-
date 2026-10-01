// Where to go after signing in or up. Only in-app paths are accepted, so a
// crafted ?next= link cannot send the visitor to another site.
export function safeNext(next: string | null, fallback = '/dashboard') {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : fallback
}
