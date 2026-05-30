import 'dotenv/config'
import { Worker } from 'bullmq'
import { redis } from '../lib/redis.js'
import { prisma } from '../lib/prisma.js'
import { uploadToR2, deleteFromR2 } from '../lib/r2.js'
import { processImage } from '../lib/imageProcesser.js'
import axios from 'axios'
import { randomUUID } from 'crypto'
import { matchingQueue, photoQueue } from '../lib/queue.js'
import { publishPhotoProcessed } from '../lib/publisher.js'

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL!
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!
// Threshold for deduplicating face profiles within an event.
// Aligned with the match.worker threshold (0.55) — same-person ArcFace
// cosine similarity across different photos is typically 0.65–0.78.
const SIMILARITY_THRESHOLD = 0.55

// Worker listens to the photo-processing queue
// and processes one job at a time
const worker = new Worker(
  'photo-processing',

  async (job) => {
    // ── Route to correct handler ──
    if (job.name === 'process-photo') {
      await handleProcessPhoto(job.data)
    } else {
      // Legacy 'detect-faces' jobs or default
      await handleDetectFaces(job.data)
    }
  },

  {
    connection: redis,
    concurrency: 3, // reduced from 5 — sharp is CPU-heavy
  }
)

/**
 * Handle 'process-photo' job:
 * 1. Download raw from R2 temp
 * 2. Generate 3 WebP variants (thumb, display, original)
 * 3. Upload variants to R2
 * 4. Update DB with final URLs
 * 5. Delete temp raw file
 * 6. Queue face detection
 */
async function handleProcessPhoto(data: { photoId: string; eventId: string; tempKey: string }) {
  const { photoId, eventId, tempKey } = data

  console.log(`[process-photo] Processing photo: ${photoId}`)

  try {
    // Download raw file from R2
    const rawUrl = `${R2_PUBLIC_URL}/${tempKey}`
    const response = await axios.get(rawUrl, { responseType: 'arraybuffer', timeout: 60000 })
    const rawBuffer = Buffer.from(response.data)

    console.log(`[process-photo] Downloaded raw file (${(rawBuffer.length / 1024).toFixed(0)}KB)`)

    // Generate 3 WebP variants
    const { thumb, display, original, width, height } = await processImage(rawBuffer)

    console.log(`[process-photo] Generated variants — thumb: ${(thumb.length / 1024).toFixed(0)}KB, display: ${(display.length / 1024).toFixed(0)}KB, original: ${(original.length / 1024).toFixed(0)}KB`)

    // Upload all 3 variants to R2
    const basePath = `events/${eventId}/${photoId}`
    const [thumbUrl, displayUrl, originalUrl] = await Promise.all([
      uploadToR2(`${basePath}/thumb.webp`, thumb, 'image/webp', { cacheControl: 'public, max-age=31536000, immutable' }),
      uploadToR2(`${basePath}/display.webp`, display, 'image/webp', { cacheControl: 'public, max-age=31536000, immutable' }),
      uploadToR2(`${basePath}/original.webp`, original, 'image/webp', { cacheControl: 'public, max-age=31536000, immutable', contentDisposition: `attachment; filename="${photoId}-original.webp"` }),
    ])

    // Update DB with final URLs and mark as processed
    const updatedPhoto = await prisma.photo.update({
      where: { id: photoId },
      data: {
        thumb_url: thumbUrl,
        display_url: displayUrl,
        original_url: originalUrl,
        width: width || undefined,
        height: height || undefined,
        processed: true,
      }
    })

    // Publish event immediately with updated URLs so client stops using tempUrl
    await publishPhotoProcessed({
      eventId,
      photoId,
      totalFaces: 0,
      photo: {
        id: updatedPhoto.id,
        display_url: updatedPhoto.display_url,
        thumb_url: updatedPhoto.thumb_url,
        original_url: updatedPhoto.original_url,
        width: updatedPhoto.width,
        height: updatedPhoto.height,
        uploaded_at: updatedPhoto.uploaded_at.toISOString(),
        processed: true,
      }
    })

    // Delete temp raw file from R2
    await deleteFromR2(tempKey).catch(err => {
      console.error(`[process-photo] Failed to delete temp file ${tempKey}:`, err.message)
    })

    console.log(`[process-photo] Photo ${photoId} variants uploaded, queuing face detection`)

    // Queue face detection as a separate job
    await photoQueue.add('detect-faces', {
      photoId,
      eventId,
      displayUrl,
    })

  } catch (error) {
    console.error(`[process-photo] Error processing photo ${photoId}:`, error)
    throw error // BullMQ will retry
  }
}

/**
 * Handle 'detect-faces' job (existing logic):
 * 1. Call Python service to detect faces
 * 2. Find or create face profiles
 * 3. Mark photo as processed
 * 4. Publish WebSocket event
 * 5. Queue matching for users with selfies
 */
async function handleDetectFaces(data: { photoId: string; eventId: string; displayUrl: string }) {
  const { photoId, eventId, displayUrl } = data

  console.log(`[detect-faces] Processing photo: ${photoId}`)

  try {
    // ── Step 1: Call Python service to detect faces ──
    const { data: responseData } = await axios.post(`${PYTHON_SERVICE_URL}/detect`, {
      photo_id: photoId,
      image_url: displayUrl,
    })

    const faces = responseData.faces

    console.log(`[detect-faces] Detected ${faces.length} face(s) in photo ${photoId}`)

    if (faces.length === 0) {
      await prisma.photo.update({
        where: { id: photoId },
        data: { processed: true }
      })
      return
    }

    // ── Step 2: For each detected face, find or create a FACE_PROFILE ──
    for (const face of faces) {
      const { bbox, embedding, confidence } = face

      const vectorString = `[${embedding.join(',')}]`

      const existingProfiles = await prisma.$queryRaw<Array<{
        id: string
        distance: number
      }>>`
        SELECT id, embedding_vector <=> ${vectorString}::vector AS distance
        FROM "FaceProfile"
        WHERE event_id = ${eventId}::text
        ORDER BY distance ASC
        LIMIT 1
      `

      let faceProfileId: string

      const profile = existingProfiles[0]
      if (
        profile &&
        profile.distance < (1 - SIMILARITY_THRESHOLD)
      ) {
        faceProfileId = profile.id
        console.log(`  Face matched to existing profile: ${faceProfileId} (distance: ${profile.distance.toFixed(3)})`)

      } else {
        const newProfileId = randomUUID()

        await prisma.$executeRaw`
                  INSERT INTO "FaceProfile" (id, event_id, embedding_vector, is_claimed, created_at)
                  VALUES (
                    ${newProfileId}::uuid,
                    ${eventId}::uuid,
                    ${vectorString}::vector,
                    false,
                    NOW()
                  )
                `

        faceProfileId = newProfileId
        console.log(`  New face profile created: ${faceProfileId}`)
      }

      // ── Step 3: Create PHOTO_FACE row ──
      await prisma.photoFace.create({
        data: {
          photo_id: photoId,
          face_profile_id: faceProfileId,
          bbox_x: bbox.x,
          bbox_y: bbox.y,
          bbox_w: bbox.w,
          bbox_h: bbox.h,
          confidence: confidence,
        }
      })

      console.log(`  PhotoFace row created for profile: ${faceProfileId}`)
    }

    // ── Step 4: Mark photo as processed ──
    const updatedPhoto = await prisma.photo.update({
      where: { id: photoId },
      data: { processed: true }
    })

    // ── Step 5: Publish WebSocket event ──
    await publishPhotoProcessed({
      eventId,
      photoId,
      totalFaces: faces.length,
      photo: {
        id: updatedPhoto.id,
        display_url: updatedPhoto.display_url,
        thumb_url: updatedPhoto.thumb_url,
        original_url: updatedPhoto.original_url,
        width: updatedPhoto.width,
        height: updatedPhoto.height,
        uploaded_at: updatedPhoto.uploaded_at.toISOString(),
        processed: true,
      }
    })

    // ── Step 6: Trigger matching for all users with selfies ──
    const usersWithSelfies = await prisma.$queryRaw<any[]>`
      SELECT DISTINCT ea.user_id
      FROM "EventAccess" ea
      INNER JOIN "User" u ON u.id = ea.user_id
      WHERE ea.event_id = ${eventId}::text AND u.selfie_embedding IS NOT NULL
    `

    for (const user of usersWithSelfies) {
      await matchingQueue.add(
        'match-user',
        {
          userId: user.user_id,
          eventId: eventId,
        },
        {
          jobId: `match-${eventId}-${user.user_id}-${Date.now()}`,
        }
      )
      console.log(`  Enqueued matching job for user ${user.user_id}`)
    }

    console.log(`[detect-faces] Photo ${photoId} processing complete`)

  } catch (error) {
    console.error(`[detect-faces] Error processing photo ${photoId}:`, error)
    throw error
  }
}

worker.on('completed', (job) => {
  console.log(`Job ${job.id} (${job.name}) completed`)
})

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} (${job?.name}) failed:`, err.message)
})

worker.on('error', (err) => {
  console.error('[Worker] Photo processing worker error:', err.message)
})

console.log('Photo processing worker started')