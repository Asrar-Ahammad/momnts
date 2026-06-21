import type { Response } from 'express'
import type { AuthRequest } from '../middleware/auth.middleware.js'
import type { PlanRequest } from '../middleware/plan.middleware.js'
import { PLAN_LIMITS } from '../lib/plan-limits.js'
import { getEffectivePlan } from '../middleware/plan.middleware.js'
import { prisma } from '../lib/prisma.js'
import { r2, uploadToR2, deleteFromR2, extractKeyFromUrl, presignPhotos, presignPhoto, presignStoredUrl } from '../lib/r2.js'
import { GetObjectCommand } from '@aws-sdk/client-s3'
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
export async function uploadPhotoController(req: PlanRequest, res: Response) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' })
        }

        const eventId = req.params.eventId as string

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
            include: { event: true }
        })

        if (!eventAccess) {
            return res.status(403).json({ message: 'You do not have access to this event' })
        }

        const isE2EE = eventAccess.event.encryption_mode === 'E2EE'

        // Look up organizer's plan for this event to get plan-aware limits
        const organizerPlan = await getEffectivePlan(eventAccess.event.user_id);
        const organizerLimits = PLAN_LIMITS[organizerPlan];

        // ─── E2EE Upload Path ────────────────────────────────────────────
        if (isE2EE) {
            // E2EE: files are ciphertext blobs, not valid images
            // Skip sharp validation, skip BullMQ queue
            // Accept encryption_iv, encryption_tag, width, height from form fields
            const encryptionIvs = ([] as string[]).concat(req.body.encryption_iv || [])
            const encryptionTags = ([] as string[]).concat(req.body.encryption_tag || [])
            const widths = ([] as string[]).concat(req.body.width || [])
            const heights = ([] as string[]).concat(req.body.height || [])

            if (encryptionIvs.length !== files.length || encryptionTags.length !== files.length) {
                // Cleanup temp files
                for (const file of files) {
                    try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path) } catch {}
                }
                return res.status(400).json({
                    message: 'E2EE uploads require encryption_iv and encryption_tag for each file',
                })
            }

            // Build file data without sharp (ciphertext is not a valid image)
            const fileData: Array<{ file: Express.Multer.File, photoId: string, r2Key: string, width: number | null, height: number | null, iv: string, tag: string }> = []
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (!file) continue;
                const photoId = crypto.randomUUID()
                const r2Key = `events/${eventId}/${photoId}/encrypted.bin`
                fileData.push({
                    file,
                    photoId,
                    r2Key,
                    width: widths[i] ? parseInt(widths[i]!, 10) || null : null,
                    height: heights[i] ? parseInt(heights[i]!, 10) || null : null,
                    iv: encryptionIvs[i]!,
                    tag: encryptionTags[i]!,
                })
            }

            // Enforce upload limits (same logic as AI path)
            const userId = req.user.id
            const result = await prisma.$transaction(async (tx: any) => {
                const current = await tx.eventAccess.findUnique({
                    where: {
                        event_id_user_id: {
                            event_id: eventId,
                            user_id: userId,
                        }
                    },
                    select: { role: true, upload_limit: true, upload_count: true }
                })
                if (!current) throw new Error('Event access not found')

                const actualCount = current.upload_count

                let limit: number;
                if (current.role === 'ORGANIZER') {
                    limit = organizerLimits.maxOrganizerUploadsPerEvent;
                } else {
                    const planLimit = organizerLimits.maxAttendeeUploadsPerEvent;
                    const eventLimit = eventAccess.event.attendee_upload_limit ?? planLimit;
                    limit = current.upload_limit ?? Math.min(eventLimit, planLimit);
                }

                if (actualCount + files.length > limit) {
                    return { success: false, current: actualCount, limit, role: current.role }
                }

                // Create DB records atomically — E2EE photos use single R2 key for all URL fields
                const photos = await Promise.all(fileData.map(data =>
                    tx.photo.create({
                        data: {
                            id: data.photoId,
                            event_id: eventId,
                            user_id: userId,
                            thumb_url: data.r2Key,
                            display_url: data.r2Key,
                            original_url: data.r2Key,
                            width: data.width,
                            height: data.height,
                            processed: true, // Nothing to process server-side for E2EE
                            is_visible: true,
                            encryption_iv: data.iv,
                            encryption_tag: data.tag,
                        }
                    })
                ))

                await tx.eventAccess.update({
                    where: {
                        event_id_user_id: {
                            event_id: eventId,
                            user_id: userId,
                        }
                    },
                    data: {
                        upload_count: { increment: files.length }
                    }
                })

                return { success: true, newCount: actualCount + files.length, role: current.role, limit, photos }
            })

            if (!result.success) {
                for (const file of files) {
                    try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path) } catch {}
                }
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

            // Upload ciphertext blobs to R2 — no processing, no queue
            const uploadedPhotos: any[] = []
            try {
                const uploadPromises = fileData.map(async (data, index) => {
                    const fileBuffer = fs.readFileSync(data.file.path)
                    await uploadToR2(data.r2Key, fileBuffer, 'application/octet-stream')
                    return result.photos![index]
                })
                const photos = await Promise.all(uploadPromises)
                uploadedPhotos.push(...photos)
            } finally {
                for (const file of files) {
                    try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path) } catch {}
                }
            }

            const effectiveLimit = result.limit!
            return res.status(201).json({
                message: `${uploadedPhotos.length} encrypted photo(s) uploaded.`,
                photos: uploadedPhotos,
                quota: {
                    used: result.newCount,
                    limit: effectiveLimit,
                    remaining: effectiveLimit - result.newCount!,
                },
            })
        }

        // ─── AI Upload Path (existing, unchanged) ────────────────────────

        // Validate each file is a valid image and gather metadata first
        const fileData: Array<{ file: Express.Multer.File, photoId: string, tempKey: string, width: number | null, height: number | null }> = []
        for (const file of files) {
            try {
                const metadata = await sharp(file.path).metadata()
                const photoId = crypto.randomUUID()
                const ext = file.originalname.split('.').pop()?.toLowerCase() || 'jpg'
                const tempKey = `temp/${eventId}/${photoId}/raw.${ext}`
                fileData.push({
                    file,
                    photoId,
                    tempKey,
                    width: metadata.width || null,
                    height: metadata.height || null
                })
            } catch (error) {
                try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path) } catch {}
                return res.status(400).json({
                    message: `Invalid image file: ${file.originalname}. Only JPEG, PNG, WebP and HEIC images are allowed.`,
                })
            }
        }

        // Enforce upload limit for both organizers and attendees
        const userId = req.user.id
        const result = await prisma.$transaction(async (tx: any) => {
            const current = await tx.eventAccess.findUnique({
                where: {
                    event_id_user_id: {
                        event_id: eventId,
                        user_id: userId,
                    }
                },
                select: { role: true, upload_limit: true, upload_count: true }
            })
            if (!current) throw new Error('Event access not found')

            const actualCount = current.upload_count

            let limit: number;
            if (current.role === 'ORGANIZER') {
                limit = organizerLimits.maxOrganizerUploadsPerEvent;
            } else {
                const planLimit = organizerLimits.maxAttendeeUploadsPerEvent;
                const eventLimit = eventAccess.event.attendee_upload_limit ?? planLimit;
                limit = current.upload_limit ?? Math.min(eventLimit, planLimit);
            }

            if (actualCount + files.length > limit) {
                return { success: false, current: actualCount, limit, role: current.role }
            }

            // Create DB records atomically
            const photos = await Promise.all(fileData.map(data => 
                tx.photo.create({
                    data: {
                        id: data.photoId,
                        event_id: eventId,
                        user_id: userId,
                        thumb_url: data.tempKey,
                        display_url: data.tempKey,
                        original_url: data.tempKey,
                        width: data.width,
                        height: data.height,
                        processed: false,
                        is_visible: true,
                    }
                })
            ))

            // Increment quota atomically
            await tx.eventAccess.update({
                where: {
                    event_id_user_id: {
                        event_id: eventId,
                        user_id: userId,
                    }
                },
                data: {
                    upload_count: { increment: files.length }
                }
            })

            return { success: true, newCount: actualCount + files.length, role: current.role, limit, photos }
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

        ;(eventAccess as any).newUploadCount = result.newCount
        ;(eventAccess as any).role = result.role
        ;(eventAccess as any).effectiveLimit = result.limit

        // Upload raw files to R2 temp location → queue worker
        const uploadedPhotos: any[] = []

        try {
            const uploadPromises = fileData.map(async (data, index) => {
                // Read from disk and upload raw to R2
                const fileBuffer = fs.readFileSync(data.file.path)
                const contentType = data.file.mimetype || 'image/jpeg'

                await uploadToR2(data.tempKey, fileBuffer, contentType)

                // Queue background processing
                await photoQueue.add('process-photo', {
                    photoId: data.photoId,
                    eventId: eventId,
                    tempKey: data.tempKey,
                }, {
                    priority: 1,
                })

                return result.photos![index]
            })

            const photos = await Promise.all(uploadPromises)
            const signedPhotos = await presignPhotos(photos)
            uploadedPhotos.push(...signedPhotos)
        } finally {
            // Clean up multer temp files
            for (const file of files) {
                try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path) } catch {}
            }
        }

        // Build response
        const newCount = (eventAccess as any).newUploadCount
        const userRole = (eventAccess as any).role
        const response: Record<string, unknown> = {
            message: `${uploadedPhotos.length} photo(s) uploaded. Processing in background.`,
            photos: uploadedPhotos,
        }

        const effectiveLimit = (eventAccess as any).effectiveLimit
        response.quota = {
            used: newCount,
            limit: effectiveLimit,
            remaining: effectiveLimit - newCount,
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
                },
                favourites: {
                    where: {
                        user_id: req.user.id
                    },
                    select: {
                        id: true
                    }
                }
            },
            orderBy: { uploaded_at: 'desc' }
        })

        const signedPhotos = await presignPhotos(photos)

        return res.status(200).json({
            message: 'Photos retrieved successfully',
            data: signedPhotos,
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

        const signedPhoto = await presignPhoto(photo)

        return res.status(200).json({
            message: 'Photo retrieved successfully',
            data: signedPhoto,
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
            },
            include: { event: true }
        })

        if (!eventAccess) {
            return res.status(403).json({ message: 'You do not have access to this event' })
        }

        // Enforce allow_downloads for attendees
        if (eventAccess.role === 'ATTENDEE' && !eventAccess.event.allow_downloads) {
            return res.status(403).json({ message: 'Downloading photos is disabled for attendees of this event' })
        }

        const photo = await prisma.photo.findUnique({
            where: { id: photoId }
        })

        if (!photo || photo.event_id !== eventId) {
            return res.status(404).json({ message: 'Photo not found' })
        }

        // Fetch from R2 directly using S3 SDK to bypass local DNS/SSL resolution issue with node fetch
        const key = photo.original_url.startsWith('http')
            ? extractKeyFromUrl(photo.original_url)
            : photo.original_url

        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: key,
        })
        const s3Response = await r2.send(command)
        if (!s3Response.Body) throw new Error('Failed to fetch from storage')

        const contentType = s3Response.ContentType || 'image/jpeg'

        // Set headers to force download
        res.setHeader('Content-Type', contentType)
        res.setHeader('Content-Disposition', `attachment; filename="momnts-${photo.id}.jpg"`)

        if (photo.encryption_iv && photo.encryption_tag) {
            res.setHeader('x-encryption-iv', photo.encryption_iv)
            res.setHeader('x-encryption-tag', photo.encryption_tag)
            res.setHeader('Access-Control-Expose-Headers', 'x-encryption-iv, x-encryption-tag')
        }

        // Convert S3 stream to buffer using standard async iteration to support all Node/Bun/SDK versions
        const chunks: any[] = []
        for await (const chunk of s3Response.Body as any) {
            chunks.push(chunk)
        }
        const buffer = Buffer.concat(chunks)
        return res.send(buffer)

    } catch (error) {
        console.error('Download proxy error:', error)
        const message = error instanceof Error ? error.message : 'Internal server error'
        return res.status(500).json({ message })
    }
}

/**
 * @name togglePhotoFavouriteController
 * @description Add or remove a photo from user's favourites.
 * @route POST /photos/:eventId/:photoId/favourite
 * @access Private
 */
export async function togglePhotoFavouriteController(req: AuthRequest, res: Response) {
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

        // Check if already favourited
        const existing = await prisma.favourite.findUnique({
            where: {
                user_id_photo_id: {
                    user_id: req.user.id,
                    photo_id: photoId
                }
            }
        })

        if (existing) {
            await prisma.favourite.delete({
                where: {
                    user_id_photo_id: {
                        user_id: req.user.id,
                        photo_id: photoId
                    }
                }
            })
            return res.status(200).json({ message: 'Removed from favourites', isFavourite: false })
        } else {
            await prisma.favourite.create({
                data: {
                    user_id: req.user.id,
                    photo_id: photoId
                }
            })
            return res.status(200).json({ message: 'Added to favourites', isFavourite: true })
        }

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return res.status(500).json({ message })
    }
}