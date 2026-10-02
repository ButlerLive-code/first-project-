// The localStorage demo kept accounts in these keys. They are removed on the
// first run of the server-backed version; old demo accounts are not migrated.
export const LEGACY_KEYS = ['laslesvpn.session', 'laslesvpn.accounts'] as const

// Storage can be unavailable (private mode): even reading window.localStorage
// may throw, so the getter is called inside the try.
export function clearLegacyStorage(getStorage: () => Pick<Storage, 'removeItem'>) {
  try {
    const storage = getStorage()
    for (const key of LEGACY_KEYS) storage.removeItem(key)
  } catch {
    // Nothing to clean up then.
  }
}
