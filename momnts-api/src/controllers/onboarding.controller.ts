import { Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { uploadToR2, deleteFromR2 } from '../lib/r2.js'
import sharp from 'sharp'
import axios from 'axios'
import { AuthRequest } from '../middleware/auth.middleware.js'
import { matchingQueue } from '../lib/queue.js'

/**
 * Handles selfie upload during onboarding.
 * Compresses the image, uploads to R2, gets embedding from vision service,
 * and updates the user record with the URL and embedding vector.
 */
export async function uploadSelfieController(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    if (!req.file) {
      return res.status(400).json({ message: "No selfie uploaded" })
    }

    // Determine before writing whether this is an update or a first upload.
    // We use this later to decide whether to restrict match jobs by timestamp.
    const existingUser = await prisma.$queryRaw<any[]>`
      SELECT id FROM "User" WHERE id = ${userId} AND selfie_embedding IS NOT NULL
    `
    const isSelfieUpdate = existingUser.length > 0

    // 3. Compress the selfie using sharp
    // Since we use diskStorage, we read from path
    const compressedSelfie = await sharp(req.file.path)
      .resize(800, 800, { fit: 'inside' })
      .jpeg({ quality: 90 })
      .toBuffer()

    // Clean up temp file immediately after reading into buffer
    import('fs').then(fs => fs.unlink(req.file!.path, () => { }))

    // 4. Upload to R2 with unique key (timestamp prevents CDN cache)
    const r2Key = `selfies/${userId}/selfie-${Date.now()}.jpg`
    const selfieUrl = await uploadToR2(r2Key, compressedSelfie, 'image/jpeg', {
      cacheControl: 'public, max-age=3600'
    })

    // 5. Call Python /embed
    // POST ${PYTHON_SERVICE_URL}/embed
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000'

    let embedding: number[]
    try {
      const response = await axios.post(`${pythonServiceUrl}/embed`, {
        selfie_url: selfieUrl
      })
      embedding = response.data.embedding
    } catch (error: any) {
      console.error('Vision service error:', error.response?.data || error.message)

      // Remove the uploaded selfie from R2 — face validation failed, don't orphan storage
      try {
        await deleteFromR2(r2Key)
      } catch (cleanupErr) {
        console.error('Failed to clean up R2 object after face rejection:', cleanupErr)
      }

      if (error.response?.status === 400) {
        return res.status(400).json({
          message: error.response?.data?.detail || "No face detected. Please upload a clear photo of your face."
        })
      }
      return res.status(500).json({
        message: "Face processing failed. Please try again."
      })
    }

    // 6. Convert embedding array to pgvector string: [x,y,z...]
    const vectorString = `[${embedding.join(',')}]`

    // 7. Update user in DB using prisma.$executeRaw
    // We must use ::vector cast for pgvector
    await prisma.$executeRaw`
      UPDATE "User"
      SET selfie_url = ${selfieUrl},
          selfie_embedding = ${vectorString}::vector
      WHERE id = ${userId}
    `

    // Enqueue face-matching for every event the user is already part of.
    //
    // First upload → scan ALL unclaimed FaceProfiles so existing photos get matched.
    // Selfie update → also scan ALL unclaimed FaceProfiles to re-match with new embedding.
    //                 Already-claimed profiles are never touched (is_claimed=false filter),
    //                 so "Your Photos" history is preserved.
    const matchOnlyAfter = undefined
    try {
      const userEvents = await prisma.eventAccess.findMany({
        where: { user_id: userId },
        select: { event_id: true },
      })
      for (const { event_id } of userEvents) {
        await matchingQueue.add(
          'match-user',
          {
            userId,
            eventId: event_id,
            ...(matchOnlyAfter && { matchOnlyAfter }),
          },
          {
            jobId: `match-${event_id}-${userId}-${Date.now()}`,
          }
        )
        console.log(`[ONBOARDING] Enqueued match job for user ${userId} in event ${event_id}${matchOnlyAfter ? ` (update — only photos after ${matchOnlyAfter})` : ' (first upload — all unclaimed)'
          }`)
      }
    } catch (queueErr) {
      // Non-fatal — matching will happen on next photo upload
      console.error('[ONBOARDING] Failed to enqueue match jobs:', queueErr)
    }

    return res.status(200).json({
      message: "Selfie uploaded successfully",
      selfie_url: selfieUrl
    })

  } catch (error: any) {
    console.error('Selfie upload error:', error)
    return res.status(500).json({ message: error.message || "Internal server error" })
  }
}
