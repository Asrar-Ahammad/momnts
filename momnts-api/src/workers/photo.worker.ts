import 'dotenv/config'
import { Worker } from 'bullmq'
import { redis } from '../lib/redis.js'
import { prisma } from '../lib/prisma.js'
import axios from 'axios'
import { randomUUID } from 'crypto'
import { matchingQueue } from '../lib/queue.js'
import { publishPhotoProcessed } from '../lib/publisher.js'

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL!
// Threshold for deduplicating face profiles within an event.
// Aligned with the match.worker threshold (0.55) — same-person ArcFace
// cosine similarity across different photos is typically 0.65–0.78.
const SIMILARITY_THRESHOLD = 0.55

// Worker listens to the photo-processing queue
// and processes one job at a time
const worker = new Worker(
  'photo-processing',

  async (job) => {
    const { photoId, eventId, displayUrl } = job.data

    console.log(`Processing job for photo: ${photoId}`)

    try {
      // ── Step 1: Call Python service to detect faces ──
      // Send the photo URL — Python downloads it, runs DeepFace, returns faces
      const { data } = await axios.post(`${PYTHON_SERVICE_URL}/detect`, {
        photo_id: photoId,
        image_url: displayUrl,
      })

      const faces = data.faces // array of { bbox, embedding, confidence }

      console.log(`Detected ${faces.length} face(s) in photo ${photoId}`)

      if (faces.length === 0) {
        // No faces found — just mark as processed and exit
        await prisma.photo.update({
          where: { id: photoId },
          data: { processed: true }
        })
        return
      }

      // ── Step 2: For each detected face, find or create a FACE_PROFILE ──
      for (const face of faces) {
        const { bbox, embedding, confidence } = face

        // Convert embedding array to pgvector string format
        // pgvector expects: '[0.1, 0.2, 0.3, ...]'
        const vectorString = `[${embedding.join(',')}]`

        // Search for an existing face profile in this event
        // that is similar to this embedding (dedup: one profile per face).
        // Searches ALL profiles (claimed + unclaimed) to avoid duplicates.
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

        if (
          existingProfiles.length > 0 &&
          existingProfiles[0].distance < (1 - SIMILARITY_THRESHOLD)
        ) {
          // ── Match found — link to existing profile ──
          faceProfileId = existingProfiles[0].id
          console.log(`  Face matched to existing profile: ${faceProfileId} (distance: ${existingProfiles[0].distance.toFixed(3)})`)

        } else {
          // No match — create new profile with pre-generated ID
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
        // Links this photo to the face profile with bounding box
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
      // Notify connected clients that this photo has been processed
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
      // This ensures all unclaimed face profiles (new or existing) get matched
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

      console.log(`Photo ${photoId} processing complete`)

    } catch (error) {
      console.error(`Error processing photo ${photoId}:`, error)
      // Throwing re-queues the job for retry (BullMQ handles this)
      throw error
    }
  },

  {
    connection: redis,
    concurrency: 5, // process 5 photos at a time
  }
)

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`)
})

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message)
})

console.log('Photo processing worker started')