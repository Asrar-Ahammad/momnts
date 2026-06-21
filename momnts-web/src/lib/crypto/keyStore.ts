/**
 * IndexedDB-backed key cache for E2EE event DEKs.
 *
 * Stores CryptoKey objects per eventId. Keys are non-extractable after storage
 * (IndexedDB preserves CryptoKey objects natively in supporting browsers).
 * Never touches localStorage, cookies, or sends keys to the server.
 */

const DB_NAME = 'momnts-keys'
const STORE_NAME = 'event-deks'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Store a DEK for an event. Overwrites any existing key. */
export async function storeDEK(eventId: string, dek: CryptoKey): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.put(dek, eventId)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

/** Retrieve a cached DEK for an event. Returns null if not found. */
export async function getDEK(eventId: string): Promise<CryptoKey | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(eventId)
    request.onsuccess = () => resolve(request.result ?? null)
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

/** Delete a cached DEK for an event ("forget this device" for one event). */
export async function deleteDEK(eventId: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(eventId)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

/** Clear all cached DEKs ("forget this device" for all events). */
export async function clearAllKeys(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.clear()
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

/** Check if a DEK exists for an event without retrieving it. */
export async function hasDEK(eventId: string): Promise<boolean> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.count(eventId)
    request.onsuccess = () => resolve(request.result > 0)
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}
