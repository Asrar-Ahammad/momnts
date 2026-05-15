const API_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000"

export interface PhotoData {
  id: string
  event_id: string
  user_id: string
  thumb_url: string
  display_url: string
  original_url: string
  width?: number
  height?: number
  uploaded_at: string
  processed: boolean
  is_visible: boolean
  user?: {
    id: string
    name: string
  }
  _count?: {
    photo_faces: number
  }
}

export interface UploadResponse {
  message: string
  photos: PhotoData[]
  quota?: {
    used: number
    limit: number | null
    remaining: number | null
  }
}

export const photosApi = {
  async getEventPhotos(eventId: string): Promise<PhotoData[]> {
    const response = await fetch(`${API_URL}/api/photos/${eventId}`, {
      credentials: "include",
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to fetch photos")
    }

    const data = await response.json()
    return data.data || []
  },

  async getPhotoDetail(eventId: string, photoId: string): Promise<PhotoData> {
    const response = await fetch(`${API_URL}/api/photos/${eventId}/${photoId}`, {
      credentials: "include",
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to fetch photo details")
    }

    const data = await response.json()
    return data.data
  },

  async getMyPhotos(eventId: string): Promise<{ data: PhotoData[]; prompt?: string; face_profile_id?: string }> {
    const response = await fetch(`${API_URL}/api/events/${eventId}/photos/mine`, {
      credentials: "include",
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to fetch your photos")
    }

    return await response.json()
  },

  async uploadPhotos(
    eventId: string,
    files: File[],
    onFileComplete?: (fileIndex: number, photo: PhotoData) => void,
    onFileError?: (fileIndex: number, error: Error) => void
  ): Promise<UploadResponse> {
    const results: PhotoData[] = []
    const errors: Array<{ index: number; error: Error }> = []
    const BATCH_SIZE = 5 // Reduced to 5 to prevent server overload
    const TIMEOUT_MS = 120000 // 2 minutes timeout per batch

    // Helper to upload a batch of files in a single request with timeout
    const uploadBatch = async (batchFiles: File[], startIndex: number): Promise<PhotoData[]> => {
      const formData = new FormData()
      batchFiles.forEach(file => {
        formData.append('photos', file)
      })

      try {
        // Use AbortController for timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

        const response = await fetch(`${API_URL}/api/photos/${eventId}/upload`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to upload photos')
        }

        const data = await response.json()
        const uploadedPhotos = data.photos || []

        // Mark each file as completed
        uploadedPhotos.forEach((photo: PhotoData, idx: number) => {
          onFileComplete?.(startIndex + idx, photo)
        })

        return uploadedPhotos
      } catch (error) {
        let err: Error
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            err = new Error('Upload timeout - please try with fewer photos')
          } else {
            err = error
          }
        } else {
          err = new Error('Failed to upload photos')
        }
        // Mark all files in batch as error
        batchFiles.forEach((_, idx) => {
          errors.push({ index: startIndex + idx, error: err })
          onFileError?.(startIndex + idx, err)
        })
        return []
      }
    }

    // Upload files in batches sequentially to avoid overwhelming the server
    const uploadBatches = async () => {
      const batchResults: PhotoData[] = []
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE)
        const batchPhotos = await uploadBatch(batch, i)
        batchResults.push(...batchPhotos)
      }
      return batchResults
    }

    const uploadedPhotos = await uploadBatches()
    results.push(...uploadedPhotos)

    if (results.length === 0 && errors.length > 0) {
      throw errors[0].error
    }

    return {
      message: `${results.length} photo(s) uploaded successfully`,
      photos: results,
    }
  },

  async deletePhoto(eventId: string, photoId: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/photos/${eventId}/${photoId}`, {
      method: "DELETE",
      credentials: "include",
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to delete photo")
    }
  },
}
