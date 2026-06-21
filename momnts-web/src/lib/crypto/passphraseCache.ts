/**
 * In-memory passphrase cache for E2EE events.
 *
 * Stores plaintext passphrases **only in the JS heap** for the duration of the
 * browser session (cleared on page reload / tab close).  Unlike sessionStorage,
 * this Map is NOT enumerable through any browser storage API and is therefore
 * inaccessible to injected scripts that call `sessionStorage.getItem(...)`.
 *
 * Never persists to localStorage, sessionStorage, IndexedDB, or cookies.
 */

const cache = new Map<string, string>()

/** Cache the passphrase for an event in memory. */
export function setPassphrase(eventId: string, passphrase: string): void {
  cache.set(eventId, passphrase)
}

/** Retrieve the cached passphrase for an event, or null if not cached. */
export function getPassphrase(eventId: string): string | null {
  return cache.get(eventId) ?? null
}

/** Remove the cached passphrase for an event (e.g. on logout / forget-device). */
export function clearPassphrase(eventId: string): void {
  cache.delete(eventId)
}

/** Remove all cached passphrases (e.g. on full logout). */
export function clearAllPassphrases(): void {
  cache.clear()
}
