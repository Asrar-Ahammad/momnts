import { Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.middleware.js'

/**
 * GET /events/:eventId/photos/all
 * Returns all photos in the event.
 * If user is ATTENDEE, only returns visible photos.
 */
export async function getAllPhotosController(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ message: "Unauthorized" })

    const { eventId } = req.params

    const eventAccess = await prisma.eventAccess.findUnique({
      where: { event_id_user_id: { event_id: eventId, user_id: userId } }
    })

    if (!eventAccess) {
      return res.status(403).json({ message: "You do not have access to this event" })
    }

    const photos = await prisma.photo.findMany({
      where: {
        event_id: eventId,
        ...(eventAccess.role === 'ATTENDEE' && { is_visible: true })
      },
      include: {
        user: { select: { id: true, name: true } },
        _count: { select: { photo_faces: true } }
      },
      orderBy: { uploaded_at: 'desc' }
    })

    return res.status(200).json({ data: photos })
  } catch (error: any) {
    return res.status(500).json({ message: error.message })
  }
}

/**
 * GET /events/:eventId/photos/mine
 * Returns photos that contain the user's face.
 */
export async function getMyPhotosController(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ message: "Unauthorized" })

    const { eventId } = req.params

    const eventAccess = await prisma.eventAccess.findUnique({
      where: { event_id_user_id: { event_id: eventId, user_id: userId } }
    })

    if (!eventAccess) {
      return res.status(403).json({ message: "You do not have access to this event" })
    }

    // 1. Check if user has selfie_embedding
    const userCheck = await prisma.$queryRaw<any[]>`
      SELECT id FROM "User" 
      WHERE id = ${userId} AND selfie_embedding IS NOT NULL
    `
    if (!userCheck.length) {
      return res.status(200).json({
        data: [],
        prompt: "Upload a selfie to find yourself in event photos."
      })
    }

    // 2. Find ALL FaceProfiles claimed by this user in this event
    const faceProfiles = await prisma.faceProfile.findMany({
      where: { event_id: eventId, claimed_by: userId }
    })

    if (faceProfiles.length === 0) {
      return res.status(200).json({
        data: [],
        prompt: "No photos of you found yet. New photos will be matched automatically."
      })
    }

    // 3. Fetch photos via PhotoFace for ALL claimed profiles
    const profileIds = faceProfiles.map(fp => fp.id)
    const photoFaces = await prisma.photoFace.findMany({
      where: { face_profile_id: { in: profileIds } },
      include: {
        photo: {
          include: {
            user: { select: { id: true, name: true } },
            _count: { select: { photo_faces: true } }
          }
        }
      }
    })

    // Deduplicate photos (same photo may have multiple face matches)
    const seenIds = new Set<string>()
    const photos = photoFaces
      .map(pf => pf.photo)
      .filter(p => {
        if (seenIds.has(p.id)) return false
        seenIds.add(p.id)
        return eventAccess.role === 'ORGANIZER' || p.is_visible
      })
      .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())

    return res.status(200).json({ 
      data: photos, 
      face_profile_ids: profileIds 
    })
  } catch (error: any) {
    return res.status(500).json({ message: error.message })
  }
}

/**
 * GET /events/:eventId/photos/uploads
 * Returns photos uploaded by the current user.
 */
export async function getMyUploadsController(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ message: "Unauthorized" })

    const { eventId } = req.params

    const eventAccess = await prisma.eventAccess.findUnique({
      where: { event_id_user_id: { event_id: eventId, user_id: userId } }
    })

    if (!eventAccess) {
      return res.status(403).json({ message: "You do not have access to this event" })
    }

    const photos = await prisma.photo.findMany({
      where: { event_id: eventId, user_id: userId },
      include: {
        _count: { select: { photo_faces: true } }
      },
      orderBy: { uploaded_at: 'desc' }
    })

    // Fetch quota
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { attendee_upload_limit: true }
    })

    const quota = eventAccess.role === 'ORGANIZER' ? null : {
      used: eventAccess.upload_count,
      limit: event?.attendee_upload_limit || 0,
      remaining: (event?.attendee_upload_limit || 0) - eventAccess.upload_count
    }

    return res.status(200).json({
      data: photos,
      quota
    })
  } catch (error: any) {
    return res.status(500).json({ message: error.message })
  }
}
