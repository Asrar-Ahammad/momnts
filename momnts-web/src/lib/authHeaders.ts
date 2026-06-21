/**
 * Returns headers with Authorization Bearer token for authenticated API requests.
 * Reads token from localStorage (legacy JWT path).
 */
export function authHeaders(contentType?: string): Record<string, string> {
  const token = localStorage.getItem('token') || ''
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
  }
  if (contentType) {
    headers['Content-Type'] = contentType
  }
  return headers
}

/** JSON auth headers — most common case */
export function jsonAuthHeaders(): Record<string, string> {
  return authHeaders('application/json')
}

/**
 * Async variant that resolves the active auth token from whichever source is
 * currently active: Clerk session (OAuth users) first, legacy localStorage JWT second.
 * Use this anywhere a Clerk-authenticated user might be making a credentialed request.
 */
export async function getAuthHeaders(contentType?: string): Promise<Record<string, string>> {
  let token = ''

  try {
    // 1. Try Clerk __session cookie (sync, fastest)
    const cookieToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('__session='))
      ?.split('=')[1]
    if (cookieToken) {
      token = decodeURIComponent(cookieToken)
    } else {
      // 2. Try Clerk JS SDK
      const clerkInstance = (window as any).Clerk
      if (clerkInstance?.session) {
        token = (await clerkInstance.session.getToken()) ?? ''
      }
    }
  } catch {
    // ignore — fall through to legacy
  }

  // 3. Fall back to legacy localStorage JWT
  if (!token) {
    token = localStorage.getItem('token') || ''
  }

  const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
  if (contentType) headers['Content-Type'] = contentType
  return headers
}
