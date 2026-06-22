import { useState, useEffect } from 'react'
import { decryptPhoto } from '@/lib/crypto/e2ee'
import { authHeaders } from '@/lib/authHeaders'
import { apiFetch } from '@/lib/apiFetch'

// Global cache for decrypted image URLs to enable instant rendering and slide preloading.
const decryptedCache = new Map<string, string>()
const cacheKeys: string[] = []
const MAX_CACHE_SIZE = 30

/**
 * Puts an object URL into the cache, maintaining the cache boundary to avoid memory leak.
 */
function setDecryptedCache(photoUrl: string, objectUrl: string) {
  if (decryptedCache.has(photoUrl)) {
    return
  }

  if (decryptedCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cacheKeys.shift()
    if (oldestKey) {
      const oldUrl = decryptedCache.get(oldestKey)
      if (oldUrl) {
        URL.revokeObjectURL(oldUrl)
      }
      decryptedCache.delete(oldestKey)
    }
  }

  decryptedCache.set(photoUrl, objectUrl)
  cacheKeys.push(photoUrl)
}

/**
 * Preloads and decrypts a photo in the background, storing the resulting Blob URL in the cache.
 */
export async function preloadAndDecryptPhoto(
  photoUrl: string,
  iv?: string,
  tag?: string,
  dek?: CryptoKey | null
): Promise<string> {
  if (!photoUrl || !iv || !tag || !dek) return photoUrl

  if (decryptedCache.has(photoUrl)) {
    return decryptedCache.get(photoUrl)!
  }

  try {
    let fetchUrl = photoUrl
    let headers: Record<string, string> = {}

    const match = photoUrl.match(/\/events\/([^\/]+)\/([^\/]+)/)
    if (match) {
      const API_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000"
      fetchUrl = `${API_URL}/api/photos/${match[1]}/${match[2]}/download`
      headers = authHeaders()
    }

    const response = await apiFetch(fetchUrl, { headers })
    if (!response.ok) throw new Error('Failed to fetch encrypted photo')
    const encryptedBuffer = await response.arrayBuffer()
    const decryptedBuffer = await decryptPhoto(encryptedBuffer, iv, tag, dek)

    const isPng = photoUrl.toLowerCase().includes('.png')
    const mimeType = isPng ? 'image/png' : 'image/webp'
    const decryptedBlob = new Blob([decryptedBuffer], { type: mimeType })
    const objectUrl = URL.createObjectURL(decryptedBlob)

    setDecryptedCache(photoUrl, objectUrl)
    return objectUrl
  } catch (err) {
    console.error('Preload decryption failed for:', photoUrl, err)
    return photoUrl
  }
}

export function useDecryptedPhoto(
  photoUrl: string,
  iv?: string,
  tag?: string,
  dek?: CryptoKey | null
) {
  const [decryptedUrl, setDecryptedUrl] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!photoUrl) {
      setDecryptedUrl('')
      return
    }

    if (!iv || !tag) {
      setDecryptedUrl(photoUrl)
      return
    }

    if (!dek) {
      setDecryptedUrl('')
      return
    }

    // Check cache first for immediate retrieval
    if (decryptedCache.has(photoUrl)) {
      setDecryptedUrl(decryptedCache.get(photoUrl)!)
      return
    }

    let active = true

    const fetchAndDecrypt = async () => {
      setLoading(true)
      setError(null)
      try {
        let fetchUrl = photoUrl
        let headers: Record<string, string> = {}

        const match = photoUrl.match(/\/events\/([^\/]+)\/([^\/]+)/)
        if (match) {
          const API_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000"
          fetchUrl = `${API_URL}/api/photos/${match[1]}/${match[2]}/download`
          headers = authHeaders()
        }

        const response = await apiFetch(fetchUrl, { headers })
        if (!response.ok) throw new Error('Failed to fetch encrypted photo')
        const encryptedBuffer = await response.arrayBuffer()
        const decryptedBuffer = await decryptPhoto(encryptedBuffer, iv, tag, dek)

        const isPng = photoUrl.toLowerCase().includes('.png')
        const mimeType = isPng ? 'image/png' : 'image/webp'
        const decryptedBlob = new Blob([decryptedBuffer], { type: mimeType })

        if (active) {
          const objectUrl = URL.createObjectURL(decryptedBlob)
          setDecryptedCache(photoUrl, objectUrl)
          setDecryptedUrl(objectUrl)
        }
      } catch (err) {
        console.error('Decryption failed for:', photoUrl, err)
        if (active) {
          setError(err instanceof Error ? err : new Error('Decryption error'))
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchAndDecrypt()

    return () => {
      active = false
      // Object URLs are retained in the global cache to support instant loading on back/forth transitions
    }
  }, [photoUrl, iv, tag, dek])

  return { url: decryptedUrl, loading, error }
}
