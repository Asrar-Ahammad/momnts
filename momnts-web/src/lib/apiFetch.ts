/**
 * Centralized fetch wrapper that intercepts 401 responses.
 * When a 401 is received on an authenticated request, it clears tokens
 * and dispatches a custom event so AuthProvider can immediately set user=null,
 * causing Protected to redirect to /login with zero delay.
 */

const AUTH_EXPIRED_EVENT = 'auth:session-expired'

/** Dispatch once — debounced so parallel 401s don't fire multiple times */
let expiredFired = false

export async function clearLocalSessionData(): Promise<void> {
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter(key => key.startsWith('momnts-') && !key.includes('fonts'))
          .map(key => caches.delete(key))
      )
    } catch (error) {
      console.error('Failed to clear caches on session cleanup:', error)
    }
  }
}

function fireSessionExpired() {
  if (expiredFired) return
  expiredFired = true
  clearLocalSessionData().catch((err) => console.error(err))
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT))
  // Reset after a tick so future expirations (e.g. user logs back in) work
  setTimeout(() => { expiredFired = false }, 500)
}

/** Listen for session-expired events (used by AuthProvider) */
export function onSessionExpired(cb: () => void): () => void {
  const handler = () => cb()
  window.addEventListener(AUTH_EXPIRED_EVENT, handler)
  return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handler)
}

/**
 * Drop-in replacement for `fetch` that auto-detects 401 on authenticated
 * requests and triggers session expiry.
 *
 * Skips interception for auth endpoints (login, register, forgot-password, reset-password)
 * where a 401 is an expected "wrong credentials" response, not a session expiry.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, init)

  if (response.status === 401) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    // Don't intercept login/register/forgot/reset — those return 401 for bad creds
    const skipPaths = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password']
    const isAuthEndpoint = skipPaths.some(p => url.includes(p))

    if (!isAuthEndpoint) {
      fireSessionExpired()
    }
  }

  return response
}
