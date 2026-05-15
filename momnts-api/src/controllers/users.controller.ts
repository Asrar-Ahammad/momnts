import type { Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { uploadToR2, deleteFromR2, extractKeyFromUrl } from '../lib/r2.js'
import sharp from 'sharp'
import axios from 'axios'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { unlink } from 'fs/promises'
import { matchingQueue } from '../lib/queue.js'

/**
 * Updates the user's selfie.
 * Compresses the image, overwrites the old selfie in R2,
 * generates a new embedding, and updates the DB.
 */
export async function updateSelfieController(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    if (!req.file) {
      return res.status(400).json({ message: "No selfie uploaded" })
    }

    // 1. Fetch existing selfie URL — we'll delete it from R2 only AFTER the new
    //    one is fully validated and saved, so a failed update never corrupts state.
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { selfie_url: true }
    })
    const oldSelfieUrl = existingUser?.selfie_url

    // 2. Compress new selfie (800x800 jpeg 90)
    const compressedSelfie = await sharp(req.file.path)
      .resize(800, 800, { fit: 'inside' })
      .jpeg({ quality: 90 })
      .toBuffer()

    await unlink(req.file.path).catch(() => { })

    // 3. Upload new selfie to R2
    const r2Key = `selfies/${userId}/selfie-${Date.now()}.jpg`
    const selfieUrl = await uploadToR2(r2Key, compressedSelfie, 'image/jpeg', { cacheControl: 'public, max-age=3600' })

    // 4. Validate face with Python /embed.
    //    If this fails, delete the new upload and leave old selfie untouched.
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000'

    let embedding: number[]
    try {
      const response = await axios.post(`${pythonServiceUrl}/embed`, {
        selfie_url: selfieUrl
      })
      embedding = response.data.embedding
    } catch (error: any) {
      console.error('Vision service error during update:', error.response?.data || error.message)

      // Delete the new (rejected) upload — old selfie in R2 and DB is unaffected
      try { await deleteFromR2(r2Key) } catch { }

      if (error.response?.status === 400) {
        return res.status(400).json({
          message: error.response?.data?.detail || "No face detected. Please upload a clear photo of your face."
        })
      }
      return res.status(500).json({
        message: "Face processing failed. Please try again."
      })
    }

    // 5. Save new selfie URL + embedding to DB
    const vectorString = `[${embedding.join(',')}]`
    await prisma.$executeRaw`
      UPDATE "User"
      SET selfie_url = ${selfieUrl},
          selfie_embedding = ${vectorString}::vector
      WHERE id = ${userId}
    `

    // 6. NOW safe to delete old selfie from R2 (DB already points to new one)
    if (oldSelfieUrl) {
      try {
        await deleteFromR2(extractKeyFromUrl(oldSelfieUrl))
        console.log(`[UPDATE_SELFIE] Deleted old selfie from R2: ${oldSelfieUrl}`)
      } catch (err) {
        console.error('[UPDATE_SELFIE] Failed to delete old selfie from R2 (non-fatal):', err)
      }
    }

    // 7. Unclaim user's own profiles so they can be re-evaluated
    //    with the new embedding. The match worker will re-claim ones
    //    that still match, so "Your Photos" stays accurate.
    try {
      const unclaimed = await prisma.faceProfile.updateMany({
        where: { claimed_by: userId },
        data: { is_claimed: false, claimed_by: null },
      })
      console.log(`[UPDATE_SELFIE] Released ${unclaimed.count} profile(s) for re-matching`)
    } catch (err) {
      console.error('[UPDATE_SELFIE] Failed to unclaim profiles (non-fatal):', err)
    }

    // 8. Enqueue matching for all events to re-claim with new embedding
    try {
      const userEvents = await prisma.eventAccess.findMany({
        where: { user_id: userId },
        select: { event_id: true },
      })
      for (const { event_id } of userEvents) {
        await matchingQueue.add(
          'match-user',
          { userId, eventId: event_id },
          { jobId: `match-${event_id}-${userId}-${Date.now()}` }
        )
        console.log(`[UPDATE_SELFIE] Enqueued match job for event ${event_id}`)
      }
    } catch (queueErr) {
      console.error('[UPDATE_SELFIE] Failed to enqueue match jobs:', queueErr)
    }

    return res.status(200).json({
      message: "Selfie updated successfully",
      selfie_url: selfieUrl
    })

  } catch (error: any) {
    console.error('Selfie update error:', error)
    return res.status(500).json({ message: error.message || "Internal server error" })
  }
}

/**
 * Updates the user's profile (name).
 */
export async function updateProfileController(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    const { name } = req.body
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ message: "Name is required" })
    }

    if (name.trim().length > 50) {
      return res.status(400).json({ message: "Name must be less than 50 characters" })
    }

    // Update user name in DB
    await prisma.user.update({
      where: { id: userId },
      data: { name: name.trim() }
    })

    return res.status(200).json({
      message: "Profile updated successfully",
      name: name.trim()
    })

  } catch (error: any) {
    console.error('Profile update error:', error)
    return res.status(500).json({ message: error.message || "Internal server error" })
  }
}
