import { authHeaders } from "../../../lib/authHeaders"
import { apiFetch } from "../../../lib/apiFetch"
import { compressImages } from "../../../lib/compressImage"

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
  favourites?: Array<{ id: string }>
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
    const response = await apiFetch(`${API_URL}/api/photos/${eventId}`, {
      headers: authHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to fetch photos")
    }

    const data = await response.json()
    return data.data || []
  },

  async getPhotoDetail(eventId: string, photoId: string): Promise<PhotoData> {
    const response = await apiFetch(`${API_URL}/api/photos/${eventId}/${photoId}`, {
      headers: authHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to fetch photo details")
    }

    const data = await response.json()
    return data.data
  },

  async getMyPhotos(eventId: string): Promise<{ data: PhotoData[]; prompt?: string; face_profile_id?: string }> {
    const response = await apiFetch(`${API_URL}/api/events/${eventId}/photos/mine`, {
      headers: authHeaders(),
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
    onFileError?: (fileIndex: number, error: Error) => void,
    signal?: AbortSignal
  ): Promise<UploadResponse> {
    const results: PhotoData[] = []
    const errors: Array<{ index: number; error: Error }> = []
    const BATCH_SIZE = 5
    const TIMEOUT_MS = 120000

    // Compress images on the client before uploading
    const compressedFiles = await compressImages(files)

    // Helper to upload a batch of files in a single request with timeout
    const uploadBatch = async (batchFiles: File[], startIndex: number): Promise<PhotoData[]> => {
      const formData = new FormData()
      batchFiles.forEach(file => {
        formData.append('photos', file)
      })

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)
      const onAbort = () => controller.abort()
      
      if (signal) {
        signal.addEventListener('abort', onAbort)
      }

      try {
        const response = await apiFetch(`${API_URL}/api/photos/${eventId}/upload`, {
            method: 'POST',
            body: formData,
            headers: authHeaders(),
            signal: controller.signal,
          })

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
            err = signal?.aborted 
              ? new Error('Upload cancelled') 
              : new Error('Upload timeout - please try with fewer photos')
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
        
        if (signal?.aborted) throw err
        return []
      } finally {
        clearTimeout(timeoutId)
        if (signal) {
          signal.removeEventListener('abort', onAbort)
        }
      }
    }

    // Upload compressed files in batches sequentially
    const uploadBatches = async () => {
      const batchResults: PhotoData[] = []
      for (let i = 0; i < compressedFiles.length; i += BATCH_SIZE) {
        if (signal?.aborted) throw new Error('Upload cancelled')
        const batch = compressedFiles.slice(i, i + BATCH_SIZE)
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
    const response = await apiFetch(`${API_URL}/api/photos/${eventId}/${photoId}`, {
      method: "DELETE",
      headers: authHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to delete photo")
    }
  },

  async toggleFavourite(eventId: string, photoId: string): Promise<{ isFavourite: boolean }> {
    const response = await apiFetch(`${API_URL}/api/photos/${eventId}/${photoId}/favourite`, {
      method: "POST",
      headers: authHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to toggle favourite")
    }

    return await response.json()
  },
}
