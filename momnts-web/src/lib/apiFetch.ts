/**
 * Centralized fetch wrapper that intercepts 401 responses.
 * When a 401 is received on an authenticated request, it attempts to silently refresh
 * the token. If the refresh fails, it clears tokens and dispatches a custom event
 * so AuthProvider can immediately set user=null, causing Protected to redirect to /login.
 *
 * Also auto-injects Authorization from the active auth source (Clerk or legacy JWT)
 * so callers do not need to be aware of which auth mechanism is active.
 */

const AUTH_EXPIRED_EVENT = 'auth:session-expired'

/** Dispatch once — debounced so parallel 401s don't fire multiple times */
let expiredFired = false
let refreshPromise: Promise<boolean> | null = null

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
 * Resolves the active bearer token from whichever auth source is currently live:
 * Clerk session (OAuth users) first, then legacy localStorage JWT.
 */
async function resolveToken(): Promise<string> {
  try {
    // 1. Clerk __session cookie (sync, no round-trip)
    const cookieToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('__session='))
      ?.split('=')[1]
    if (cookieToken) return decodeURIComponent(cookieToken)

    // 2. Clerk JS SDK (async, handles token refresh internally)
    const clerkInstance = (window as any).Clerk
    if (clerkInstance?.session) {
      const token = await clerkInstance.session.getToken()
      if (token) return token
    }
  } catch {
    // fall through to legacy
  }

  // 3. Legacy localStorage JWT
  return localStorage.getItem('token') || ''
}

async function performRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return false

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)

  try {
    const API_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000"
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      signal: controller.signal
    })

    if (!response.ok) {
      return false
    }

    const data = await response.json()
    if (
      !data ||
      typeof data.accessToken !== 'string' ||
      data.accessToken.trim().length === 0 ||
      typeof data.refreshToken !== 'string' ||
      data.refreshToken.trim().length === 0
    ) {
      console.error('Invalid or empty token received from refresh endpoint')
      return false
    }
    localStorage.setItem('token', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    return true
  } catch (error) {
    console.error('Failed to refresh token:', error)
    return false
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Drop-in replacement for `fetch` that:
 * 1. Auto-injects Authorization from the active auth source (Clerk or legacy JWT).
 * 2. Auto-detects 401 on authenticated requests and triggers session expiry.
 *
 * Skips interception for auth endpoints (login, register, forgot-password, reset-password, refresh)
 * where a 401 is an expected "wrong credentials" response, not a session expiry.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const isRequest = input instanceof Request

  // ── Inject Authorization from the active auth source ──────────────────────
  const token = await resolveToken()
  let mergedHeaders: Record<string, string> = { Authorization: `Bearer ${token}` }
  if (init?.headers) {
    if (init.headers instanceof Headers) {
      init.headers.forEach((value, key) => { mergedHeaders[key] = value })
    } else if (Array.isArray(init.headers)) {
      init.headers.forEach(([key, value]) => { mergedHeaders[key] = value })
    } else {
      mergedHeaders = { ...mergedHeaders, ...(init.headers as Record<string, string>) }
    }
  }
  const mergedInit: RequestInit = { ...init, headers: mergedHeaders }

  const requestForFirstTry = isRequest ? input.clone() : input
  const response = await fetch(requestForFirstTry, mergedInit)

  if (response.status === 401) {
    const url = isRequest ? input.url : typeof input === 'string' ? input : input.href
    // Don't intercept login/register/forgot/reset/refresh — those return 401 for bad creds
    const skipPaths = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password', '/auth/refresh']
    const isAuthEndpoint = skipPaths.some(p => url.includes(p))

    if (!isAuthEndpoint) {
      // Try to refresh token (legacy path — Clerk handles its own refresh internally)
      if (!refreshPromise) {
        refreshPromise = performRefresh().finally(() => {
          refreshPromise = null
        })
      }

      const refreshed = await refreshPromise
      if (refreshed) {
        // Re-resolve after refresh (will now pick up the new localStorage token)
        const newToken = await resolveToken()
        const retryHeaders = { ...mergedHeaders, Authorization: `Bearer ${newToken}` }

        if (isRequest) {
          const newRequest = input.clone()
          newRequest.headers.set('Authorization', `Bearer ${newToken}`)
          return fetch(newRequest, { ...mergedInit, headers: retryHeaders })
        } else {
          return fetch(input, { ...mergedInit, headers: retryHeaders })
        }
      } else {
        fireSessionExpired()
      }
    }
  }

  return response
}
