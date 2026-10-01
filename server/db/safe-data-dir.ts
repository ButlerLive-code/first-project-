import { isAbsolute, relative, resolve } from 'node:path'

// Returns the absolute path to delete, or throws. Deleting is allowed only
// strictly inside the project root (never the root itself) and never in production.
// `cwd` is what a relative DATA_DIR resolves against, as it does when the API opens it.
export function assertSafeDataDir(
  dataDir: string,
  root: string,
  env: Record<string, string | undefined> = process.env,
  cwd: string = process.cwd(),
) {
  if (env.NODE_ENV === 'production') throw new Error('Refusing to reset the database when NODE_ENV=production')
  const target = resolve(cwd, dataDir)
  const rel = relative(resolve(root), target)
  if (!dataDir || rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`Refusing to delete "${target}": DATA_DIR must be inside the project (${root}), not the project itself`)
  }
  return target
}
