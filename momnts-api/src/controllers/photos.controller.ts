import type { Response } from 'express'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import { prisma } from '../lib/prisma.js'
import { uploadToR2, deleteFromR2, extractKeyFromUrl } from '../lib/r2.js'
import { processImage } from '../lib/imageProcesser.js'
import { photoQueue } from '../lib/queue.js'
import crypto from 'crypto'
import fs from 'fs'
import sharp from 'sharp'

/**
 * @name uploadPhotoController
 * @description Upload photos to an event. Organizers have no limit,
 *              attendees are limited by event.attendee_upload_limit
 * @route POST /photos/:eventId/upload
 * @access Private
 */
export async function uploadPhotoController(req: AuthRequest, res: Response) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' })
        }

        const eventId = req.params.eventId as string

        // req.files is populated by multer middleware
        // It contains the uploaded file bytes in memory
        const files = req.files as Express.Multer.File[]
        if (!files || files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' })
        }

        // Check user is a member of this event
        const eventAccess = await prisma.eventAccess.findUnique({
            where: {
                event_id_user_id: {
                    event_id: eventId,
                    user_id: req.user.id,
                }
            },
            include: {
                // Include event so we can check the upload limit
                event: true,
            }
        })

        if (!eventAccess) {
            return res.status(403).json({ message: 'You do not have access to this event' })
        }

        // Enforce upload limit for attendees and track upload count for all users
        const userId = req.user.id
        const result = await prisma.$transaction(async (tx: any) => {
            const current = await tx.eventAccess.findUnique({
                where: {
                    event_id_user_id: {
                        event_id: eventId,
                        user_id: userId,
                    }
                },
                select: { role: true }
            })
            if (!current) throw new Error('Event access not found')

            // Count actual photos in DB (not the drifting upload_count field)
            const actualCount = await tx.photo.count({
                where: { event_id: eventId, user_id: userId }
            })

            // Enforce limit for attendees only
            if (current.role === 'ATTENDEE') {
                const limit = eventAccess.event.attendee_upload_limit
                if (actualCount + files.length > limit) {
                    return { success: false, current: actualCount, limit, role: current.role }
                }
            }

            return { success: true, newCount: actualCount + files.length, role: current.role }
        })

        if (!result.success) {
            const remainingQuota = result.limit! - result.current
            return res.status(400).json({
                message: remainingQuota <= 0
                    ? `Upload limit reached. You can upload a maximum of ${result.limit} photos per event.`
                    : `You can only upload ${remainingQuota} more photo(s). You tried to upload ${files.length}.`,
                upload_count: result.current,
                limit: result.limit,
                remaining_quota: remainingQuota,
            })
        }

        // Store the new count for response
        ; (eventAccess as any).newUploadCount = result.newCount
            ; (eventAccess as any).role = result.role

        // Validate each file is a valid image using sharp (not just client-controlled mimetype)
        for (const file of files) {
            try {
                await sharp(file.path).metadata()
            } catch (error) {
                // Clean up invalid file
                try {
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path)
                    }
                } catch (cleanupError) {
                    console.error(`Failed to delete invalid file ${file.path}:`, cleanupError)
                }
                return res.status(400).json({
                    message: `Invalid image file: ${file.originalname}. Only JPEG, PNG, WebP and HEIC images are allowed.`,
                })
            }
        }

        // Process and upload files in parallel with compensation logic
        let results;
        let uploadedPhotos: any[] = [];
        try {
            const uploadPromises = files.map(async (file) => {
                const photoId = crypto.randomUUID()
                const basePath = `events/${eventId}/${photoId}`

                // Compress image into 3 versions
                const { thumb, display, original, width, height } = await processImage(file.path)

                // Upload all 3 versions to R2 with compensation tracking
                const uploadResults = await Promise.allSettled([
                    uploadToR2(`${basePath}/thumb.webp`, thumb, 'image/webp', { cacheControl: 'public, max-age=31536000, immutable' }),
                    uploadToR2(`${basePath}/display.webp`, display, 'image/webp', { cacheControl: 'public, max-age=31536000, immutable' }),
                    uploadToR2(`${basePath}/original.webp`, original, 'image/webp', { cacheControl: 'public, max-age=31536000, immutable', contentDisposition: `attachment; filename="${photoId}-original.webp"` }),
                ])

                const rejected = uploadResults.filter(r => r.status === 'rejected')
                if (rejected.length > 0) {
                    const successfulUrls = uploadResults
                        .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
                        .map(r => r.value)
                    
                    if (successfulUrls.length > 0) {
                        await Promise.allSettled(successfulUrls.map(url => deleteFromR2(extractKeyFromUrl(url))))
                    }
                    throw new Error(`Failed to upload one or more variants for ${file.originalname}`)
                }

                const [thumbUrl, displayUrl, originalUrl] = uploadResults.map((r: any) => r.value)
                return { photoId, thumbUrl, displayUrl, originalUrl, width, height }
            })

            const batchResults = await Promise.allSettled(uploadPromises)
            
            const anyFailed = batchResults.some(r => r.status === 'rejected')
            if (anyFailed) {
                // Compensation: cleanup all files that succeeded in the batch
                const successfulFiles = batchResults
                    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
                    .map(r => r.value)
                
                const deletePromises = successfulFiles.flatMap(file => [
                    deleteFromR2(extractKeyFromUrl(file.thumbUrl)),
                    deleteFromR2(extractKeyFromUrl(file.displayUrl)),
                    deleteFromR2(extractKeyFromUrl(file.originalUrl))
                ])

                if (deletePromises.length > 0) {
                    await Promise.allSettled(deletePromises)
                }

                throw new Error('One or more photo uploads failed. All changes reverted.')
            }

            results = batchResults.map((r: any) => r.value)

        uploadedPhotos = await Promise.all(
            results.map(async ({ photoId, thumbUrl, displayUrl, originalUrl, width, height }) => {
                const photo = await prisma.photo.create({
                    data: {
                        id: photoId,
                        event_id: eventId,
                        user_id: req.user!.id,
                        thumb_url: thumbUrl,
                        display_url: displayUrl,
                        original_url: originalUrl,
                        width: width || null,
                        height: height || null,
                        processed: false,
                        is_visible: true,
                    }
                })

                try {
                    // Add job to queue for face detection
                    await photoQueue.add('detect-faces', {
                        photoId: photo.id,
                        eventId: eventId,
                        displayUrl: displayUrl,
                    })
                } catch (queueError) {
                    console.error(`Queue failed for photo ${photo.id}, rolling back:`, queueError)
                    await prisma.photo.delete({ where: { id: photo.id } }).catch(() => {})
                    await Promise.allSettled([
                        deleteFromR2(extractKeyFromUrl(thumbUrl)),
                        deleteFromR2(extractKeyFromUrl(displayUrl)),
                        deleteFromR2(extractKeyFromUrl(originalUrl))
                    ])
                    throw queueError
                }

                return photo
            })
        )
        } finally {
            // Clean up temp files regardless of success or error
            for (const file of files) {
                try {
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path)
                    }
                } catch (err) {
                    console.error(`Failed to delete temp file ${file.path}:`, err)
                }
            }
        }


        // Build response — include upload count for all users
        const newCount = (eventAccess as any).newUploadCount
        const userRole = (eventAccess as any).role
        const response: Record<string, unknown> = {
            message: `${uploadedPhotos.length} photo(s) uploaded successfully. Face detection is running in the background.`,
            photos: uploadedPhotos,
        }

        if (userRole === 'ATTENDEE') {
            response.quota = {
                used: newCount,
                limit: eventAccess.event.attendee_upload_limit,
                remaining: eventAccess.event.attendee_upload_limit - newCount,
            }
        } else {
            response.quota = {
                used: newCount,
                limit: null, // Organizers have no limit
                remaining: null,
            }
        }

        return res.status(201).json(response)

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return res.status(500).json({ message })
    }
}

/**
 * @name getEventPhotosController
 * @description Get all photos in an event.
 *              Organizers see all photos, attendees see only visible ones.
 * @route GET /photos/:eventId
 * @access Private
 */
export async function getEventPhotosController(req: AuthRequest, res: Response) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' })
        }

        const eventId = req.params.eventId as string

        const eventAccess = await prisma.eventAccess.findUnique({
            where: {
                event_id_user_id: {
                    event_id: eventId,
                    user_id: req.user.id,
                }
            }
        })

        if (!eventAccess) {
            return res.status(403).json({ message: 'You do not have access to this event' })
        }

        const photos = await prisma.photo.findMany({
            where: {
                event_id: eventId,
                // Organizers see everything including hidden photos
                // Attendees only see visible photos
                ...(eventAccess.role === 'ATTENDEE' && { is_visible: true }),
            },
            include: {
                // Include uploader's name so UI can show "Uploaded by Asrar"
                user: {
                    select: { id: true, name: true }
                },
                // Include face count so UI can show how many faces were detected
                _count: {
                    select: { photo_faces: true }
                }
            },
            orderBy: { uploaded_at: 'desc' }
        })

        return res.status(200).json({
            message: 'Photos retrieved successfully',
            data: photos,
        })

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return res.status(500).json({ message })
    }
}

/**
 * @name getPhotoDetailController
 * @description Get a single photo with all detected face bounding boxes.
 *              Used to highlight faces in the photo detail view.
 * @route GET /photos/:eventId/:photoId
 * @access Private
 */
export async function getPhotoDetailController(req: AuthRequest, res: Response) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' })
        }

        const eventId = req.params.eventId as string
        const photoId = req.params.photoId as string

        // Verify event access
        const eventAccess = await prisma.eventAccess.findUnique({
            where: {
                event_id_user_id: {
                    event_id: eventId,
                    user_id: req.user.id,
                }
            }
        })

        if (!eventAccess) {
            return res.status(403).json({ message: 'You do not have access to this event' })
        }

        const photo = await prisma.photo.findUnique({
            where: { id: photoId },
            include: {
                user: { select: { id: true, name: true } },
                // photo_faces contains bounding boxes for each detected face
                // bbox_x, bbox_y, bbox_w, bbox_h tell the UI where to draw the highlight box
                photo_faces: {
                    include: {
                        face_profile: {
                            select: {
                                id: true,
                                is_claimed: true,
                                claimed_by: true,
                            }
                        }
                    }
                }
            }
        })

        if (!photo) {
            return res.status(404).json({ message: 'Photo not found' })
        }
        if (photo.event_id !== eventId) {
            return res.status(404).json({ message: 'Photo not found' })
        }
        // Attendees can't see hidden photos
        if (eventAccess.role === 'ATTENDEE' && !photo.is_visible) {
            return res.status(404).json({ message: 'Photo not found' })
        }

        return res.status(200).json({
            message: 'Photo retrieved successfully',
            data: photo,
        })

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return res.status(500).json({ message })
    }
}

/**
 * @name deletePhotoController
 * @description Delete a photo.
 *              Organizers can delete any photo.
 *              Attendees can only delete their own uploads (and get quota back).
 * @route DELETE /photos/:eventId/:photoId
 * @access Private
 */
export async function deletePhotoController(req: AuthRequest, res: Response) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' })
        }

        const eventId = req.params.eventId as string
        const photoId = req.params.photoId as string

        const eventAccess = await prisma.eventAccess.findUnique({
            where: {
                event_id_user_id: {
                    event_id: eventId,
                    user_id: req.user.id,
                }
            }
        })

        if (!eventAccess) {
            return res.status(403).json({ message: 'You do not have access to this event' })
        }

        const photo = await prisma.photo.findUnique({
            where: { id: photoId }
        })

        if (!photo) {
            return res.status(404).json({ message: 'Photo not found' })
        }

        if (photo.event_id !== eventId) {
            return res.status(404).json({ message: 'Photo not found' })
        }

        // Attendees can only delete their own photos
        if (eventAccess.role === 'ATTENDEE' && photo.user_id !== req.user.id) {
            return res.status(403).json({ message: 'You can only delete your own photos' })
        }

        // Delete from DB — cascades to PhotoFace rows automatically
        await prisma.photo.delete({ where: { id: photoId, event_id: eventId } })

        // Delete all 3 versions from R2
        // extractKeyFromUrl converts full URL → R2 key
        // e.g. "https://pub-xxx.r2.dev/events/abc/thumb.jpg" → "events/abc/thumb.jpg"
        await Promise.all([
            deleteFromR2(extractKeyFromUrl(photo.thumb_url)),
            deleteFromR2(extractKeyFromUrl(photo.display_url)),
            deleteFromR2(extractKeyFromUrl(photo.original_url)),
        ])

        // Decrement upload count for the photo uploader (organizers and attendees)
        const uploaderAccess = await prisma.eventAccess.findUnique({
            where: {
                event_id_user_id: {
                    event_id: eventId,
                    user_id: photo.user_id,
                }
            }
        })

        if (uploaderAccess) {
            await prisma.eventAccess.update({
                where: {
                    event_id_user_id: {
                        event_id: eventId,
                        user_id: photo.user_id,
                    }
                },
                data: {
                    upload_count: { decrement: 1 } // atomic decrement
                }
            })
        }

        return res.status(200).json({ message: 'Photo deleted successfully' })

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return res.status(500).json({ message })
    }
}

/**
 * @name downloadPhotoController
 * @description Proxy photo download from R2 to bypass CORS and force download.
 * @route GET /photos/:eventId/:photoId/download
 * @access Private
 */
export async function downloadPhotoController(req: AuthRequest, res: Response) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' })
        }

        const eventId = req.params.eventId as string
        const photoId = req.params.photoId as string

        // Verify event access
        const eventAccess = await prisma.eventAccess.findUnique({
            where: {
                event_id_user_id: {
                    event_id: eventId,
                    user_id: req.user.id,
                }
            }
        })

        if (!eventAccess) {
            return res.status(403).json({ message: 'You do not have access to this event' })
        }

        const photo = await prisma.photo.findUnique({
            where: { id: photoId }
        })

        if (!photo || photo.event_id !== eventId) {
            return res.status(404).json({ message: 'Photo not found' })
        }

        // Fetch from R2 and stream to response
        const response = await fetch(photo.original_url)
        if (!response.ok) throw new Error('Failed to fetch from storage')

        const contentType = response.headers.get('content-type') || 'image/jpeg'

        // Set headers to force download
        res.setHeader('Content-Type', contentType)
        res.setHeader('Content-Disposition', `attachment; filename="momnts-${photo.id}.jpg"`)

        // Using ArrayBuffer as a fallback for simple streaming
        const buffer = await response.arrayBuffer()
        return res.send(Buffer.from(buffer))

    } catch (error) {
        console.error('Download proxy error:', error)
        const message = error instanceof Error ? error.message : 'Internal server error'
        return res.status(500).json({ message })
    }
}