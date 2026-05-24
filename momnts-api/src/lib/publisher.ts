import Redis from 'ioredis'
import { redisConnectionOptions, REDIS_URL } from './redis'

/**
 * Dedicated Redis publisher for workers.
 * Workers run in separate processes, can't access Socket.IO directly.
 * They publish to Redis channels, and the API server's subscriber
 * relays messages to Socket.IO clients.
 */
const publisher = new Redis(REDIS_URL, redisConnectionOptions)

publisher.on('error', (err) => {
  console.error('[Publisher] Redis connection error:', err.message)
})

export interface PhotoProcessedEvent {
  eventId: string
  photoId: string
  totalFaces: number
  photo: {
    id: string
    display_url: string
    thumb_url: string
    original_url: string
    width: number | null
    height: number | null
    uploaded_at: string
    processed: boolean
  }
}

export interface FaceMatchedEvent {
  eventId: string
  userId: string
  matchedPhotoCount: number
  matchedProfileIds: string[]
}

export async function publishPhotoProcessed(data: PhotoProcessedEvent) {
  await publisher.publish('ws:photo-processed', JSON.stringify(data))
}

export async function publishFaceMatched(data: FaceMatchedEvent) {
  await publisher.publish('ws:face-matched', JSON.stringify(data))
}
