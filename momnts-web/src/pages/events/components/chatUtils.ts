interface CachedPhoto {
  cleanPath: string
  presignedUrl: string
  timestamp: number
}

const profilePhotoCache: Record<string, CachedPhoto> = {}

export const getCachedProfilePhoto = (userId: string, incomingUrl: string | null | undefined): string | undefined => {
  if (!incomingUrl) return undefined
  const cleanPath = incomingUrl.split("?")[0]
  const cached = profilePhotoCache[userId]
  const now = Date.now()
  if (!cached || cached.cleanPath !== cleanPath || (now - cached.timestamp > 60 * 60 * 1000)) {
    profilePhotoCache[userId] = { cleanPath, presignedUrl: incomingUrl, timestamp: now }
    return incomingUrl
  }
  return cached.presignedUrl
}
