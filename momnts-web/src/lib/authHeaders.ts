/**
 * Returns headers with Authorization Bearer token for authenticated API requests.
 * Reads token from localStorage.
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
