import type { Response } from "express";
import { prisma } from "../lib/prisma.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import crypto from 'crypto'
import { matchingQueue } from "../lib/queue.js";
import { presignStoredUrl, deleteFromR2, extractKeyFromUrl } from "../lib/r2.js";

/**
 * Presigns nested photo preview URLs and attendee selfie_urls
 * found in event listing / detail responses.
 */
async function presignEventData(event: any): Promise<any> {
    const result = { ...event };

    // Presign cover photo preview (photos[] array with thumb_url / display_url)
    if (Array.isArray(result.photos)) {
        result.photos = await Promise.all(
            result.photos.map(async (p: any) => ({
                ...p,
                ...(p.thumb_url ? { thumb_url: await presignStoredUrl(p.thumb_url, 3600) } : {}),
                ...(p.display_url ? { display_url: await presignStoredUrl(p.display_url, 3600) } : {}),
            }))
        );
    }

    // Presign attendee selfie avatars (event_access[].user.selfie_url)
    if (Array.isArray(result.event_access)) {
        result.event_access = await Promise.all(
            result.event_access.map(async (ea: any) => {
                if (ea.user?.selfie_url) {
                    return {
                        ...ea,
                        user: { ...ea.user, selfie_url: await presignStoredUrl(ea.user.selfie_url, 86400) }
                    };
                }
                return ea;
            })
        );
    }

    return result;
}
import { getIO } from "../lib/socket.js";

/**
 * @name createEventController
 * @description Creates a new event with a random invite code
 * @access Public
 */

async function generateUniqueInviteCode(): Promise<string> {
    const MAX_ATTEMPTS = 10;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {

        const code = crypto.randomBytes(3).toString('hex').toUpperCase()

        const existing = await prisma.event.findUnique({
            where: { invite_code: code }
        })

        if (!existing) return code
    }

    throw new Error("Failed to generate unique invite code after maximum attempts");
}


async function createEventController(req: AuthRequest, res: Response) {
    try {
        const { name, date, location, attendeeUploadLimit, attendee_upload_limit, isSecure } = req.body;

        if (!name || !date || !location) {
            return res.status(400).json({
                message: "Please provide name, date and location",
            });
        }

        const invite_code = await generateUniqueInviteCode();

        const eventDate = new Date(date);
        if (isNaN(eventDate.getTime())) {
            return res.status(400).json({ message: "Invalid date format" });
        }

        if (!req.user?.id) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const rawLimit = attendeeUploadLimit !== undefined ? attendeeUploadLimit : attendee_upload_limit;
        const parsedLimit = rawLimit !== undefined && rawLimit !== null ? parseInt(String(rawLimit), 10) : 10;
        const attendee_upload_limit_parsed = (!isNaN(parsedLimit) && parsedLimit >= 0) ? parsedLimit : 10;

        const event = await prisma.event.create({
            data: {
                name: name,
                date: eventDate,
                location: location,
                invite_code: invite_code,
                user_id: req.user.id,
                attendee_upload_limit: attendee_upload_limit_parsed,
                is_secure: typeof isSecure === 'boolean' ? isSecure : true,
            },
        });
        const eventAccess = await prisma.eventAccess.create({
            data: {
                event_id: event.id,
                role: "ORGANIZER",
                user_id: req.user.id
            }
        })

        // Enqueue face-matching job if user has a selfie
        const users = await prisma.$queryRaw<{ selfie_url: string | null }[]>`
            SELECT selfie_url FROM "User" 
            WHERE id = ${req.user.id}::text AND selfie_embedding IS NOT NULL
        `
        if (users.length > 0 && users[0]?.selfie_url) {
            const presignedSelfieUrlForMatch = await presignStoredUrl(users[0].selfie_url, 1800)
            await matchingQueue.add(
                'match-user',
                {
                    userId: req.user.id,
                    eventId: event.id,
                    selfieUrl: presignedSelfieUrlForMatch,
                },
                {
                    jobId: `match-${event.id}-${req.user.id}-${Date.now()}`
                }
            )
        }

        return res.status(201).json({
            message: "Event created successfully",
            event: event,
            eventAccess: eventAccess
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal server error";
        return res.status(500).json({ message });
    }
}

/**
 * @name getEventDetailsController
 * @description Gets details of a particular event related to the user.
 * @route GET /events/:eventId
 * @access Private
 */
async function getEventDetailsController(req: AuthRequest, res: Response) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const eventId = req.params.eventId as string;

        if (!eventId) {
            return res.status(400).json({ message: "Event ID is required" });
        }

        // Check user has access to this event (creator or attendee)
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

        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                _count: {
                    select: {
                        photos: true,
                        event_access: true,
                    }
                },
                photos: {
                    take: 1,
                    orderBy: { uploaded_at: 'desc' },
                    select: {
                        thumb_url: true,
                        display_url: true,
                    }
                }
            }
        })
        if (!event) {
            return res.status(404).json({ message: "Event not found" })
        }
        const signedEvent = await presignEventData(event);
        
        let pendingRequestCount = 0;
        if (eventAccess.role === 'ORGANIZER') {
            pendingRequestCount = await prisma.joinRequest.count({
                where: {
                    event_id: eventId,
                    status: 'PENDING'
                }
            });
        }

        return res.status(200).json({
            event: {
                ...signedEvent,
                user_role: eventAccess.role,
                pending_request_count: pendingRequestCount,
                attendee_upload_limit: eventAccess.upload_limit !== null && eventAccess.upload_limit !== undefined
                    ? eventAccess.upload_limit
                    : event.attendee_upload_limit
            }
        })

    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal server error";
        return res.status(500).json({ message });
    }
}

/**
 * @name joinEventController
 * @description Joins an event
 * @route POST /events/:eventId/join
 * @access Private
 */

async function joinEventController(req: AuthRequest, res: Response) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' })
        }

        const { inviteCode } = req.body

        if (!inviteCode) {
            return res.status(400).json({ message: 'Invite code is required' })
        }

        // Find event by invite code
        const event = await prisma.event.findUnique({
            where: { invite_code: inviteCode }
        })

        if (!event) {
            return res.status(404).json({ message: 'Invalid invite code' })
        }

        // Check event is still active
        if (!event.is_active) {
            return res.status(400).json({ message: 'This event is no longer active' })
        }

        // Organizer can't join their own event
        if (event.user_id === req.user.id) {
            return res.status(400).json({ message: 'You are the organizer of this event' })
        }

        // Check if already a member
        const existing = await prisma.eventAccess.findUnique({
            where: {
                event_id_user_id: {
                    event_id: event.id,
                    user_id: req.user.id,
                }
            }
        })

        if (existing) {
            return res.status(400).json({ message: 'You are already a member of this event' })
        }

        // Check if there is an existing request
        const existingRequest = await prisma.joinRequest.findUnique({
            where: {
                event_id_user_id: {
                    event_id: event.id,
                    user_id: req.user.id
                }
            }
        });

        if (existingRequest) {
            if (existingRequest.status === 'PENDING') {
                return res.status(400).json({ message: 'You have a pending request to join this event' });
            }
            if (existingRequest.status === 'REJECTED') {
                const cooldownHours = 48;
                const cooldownMs = cooldownHours * 60 * 60 * 1000;
                const timeSinceRejection = Date.now() - new Date(existingRequest.updated_at).getTime();
                if (timeSinceRejection < cooldownMs) {
                    const hoursRemaining = Math.ceil((cooldownMs - timeSinceRejection) / (1000 * 60 * 60));
                    return res.status(400).json({ 
                        message: `Your request was rejected or you were removed. You can request/join again in ${hoursRemaining} hours.` 
                    });
                }
            }
        }

        if (event.is_secure) {
            if (existingRequest) {
                // Reset request to PENDING
                await prisma.joinRequest.update({
                    where: { id: existingRequest.id },
                    data: { status: 'PENDING', rejection_reason: null }
                });
            } else {
                // Create a new JoinRequest
                await prisma.joinRequest.create({
                    data: {
                        event_id: event.id,
                        user_id: req.user.id,
                        status: 'PENDING'
                    }
                });
            }

            // Send notification to the organizer
            try {
                const user = await prisma.user.findUnique({
                    where: { id: req.user.id },
                    select: { name: true, selfie_url: true }
                });

                const notification = await prisma.notification.create({
                    data: {
                        user_id: event.user_id,
                        title: "Join Request",
                        message: `${user?.name || 'Someone'} has requested to join ${event.name}`,
                        type: "JOIN_REQUEST",
                        link: `/events/${event.id}?view=requests`,
                        image_url: user?.selfie_url || null
                    }
                });

                const io = getIO();
                io.to(`user:${event.user_id}`).emit('notification:new', notification);
                io.to(`event:${event.id}`).emit('join-request:change', { eventId: event.id, userId: req.user.id, status: 'PENDING' });
            } catch (err) {
                console.error('[Notification/Socket] Failed to send join request notification:', err);
            }

            return res.status(202).json({
                message: 'Join request sent successfully',
                status: 'PENDING'
            });
        }

        const eventAccess = await prisma.eventAccess.create({
            data: {
                event_id: event.id,
                user_id: req.user.id,
                role: 'ATTENDEE',
            },
            include: {
                user: {
                    select: { 
                        name: true,
                        selfie_url: true
                    }
                }
            }
        });

        // Ensure any JoinRequest is updated to APPROVED for consistency
        await prisma.joinRequest.upsert({
            where: {
                event_id_user_id: {
                    event_id: event.id,
                    user_id: req.user.id
                }
            },
            update: { status: 'APPROVED' },
            create: {
                event_id: event.id,
                user_id: req.user.id,
                status: 'APPROVED'
            }
        });

        // Create notification for the organizer (Non-blocking)
        try {
            const notification = await prisma.notification.create({
                data: {
                    user_id: event.user_id,
                    title: "New Attendee",
                    message: `${eventAccess.user.name} has joined ${event.name}`,
                    type: "EVENT_JOIN",
                    link: `/events/${event.id}?view=attendees`,
                    image_url: eventAccess.user.selfie_url
                }
            })

            // Emit real-time notification via Socket.IO
            const io = getIO()
            io.to(`user:${event.user_id}`).emit('notification:new', notification)
        } catch (err) {
            console.error('[Notification/Socket] Failed to process join notification:', err)
        }

        // Enqueue face-matching job if user has a selfie
        const users = await prisma.$queryRaw<{ selfie_url: string | null }[]>`
            SELECT selfie_url FROM "User" 
            WHERE id = ${req.user.id}::text AND selfie_embedding IS NOT NULL
        `
        if (users.length > 0 && users[0]?.selfie_url) {
            const presignedSelfieUrlForMatch = await presignStoredUrl(users[0].selfie_url, 1800)
            await matchingQueue.add(
                'match-user',
                {
                    userId: req.user.id,
                    eventId: event.id,
                    selfieUrl: presignedSelfieUrlForMatch,
                },
                {
                    jobId: `match-${event.id}-${req.user.id}-${Date.now()}`,
                }
            )
        }

        return res.status(201).json({
            message: 'Joined event successfully',
            data: {
                event: {
                    id: event.id,
                    name: event.name,
                    location: event.location,
                    date: event.date,
                },
                role: eventAccess.role,
            }
        })

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return res.status(500).json({ message })
    }
}

/**
 * @name getJoinedEventsController
 * @description Gets all events joined by the user.
 * @route GET /events/joined
 * @access Private
 */
async function getJoinedEventsController(req: AuthRequest, res: Response) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const events = await prisma.eventAccess.findMany({
            where: {
                user_id: req.user?.id,
                role: "ATTENDEE"
            },
            include: {
                event: {
                    include: {
                        _count: {
                            select: { event_access: true, photos: true }
                        },
                        photos: {
                            take: 1,
                            orderBy: { uploaded_at: 'desc' },
                            select: {
                                thumb_url: true,
                                display_url: true,
                            }
                        },
                        event_access: {
                            take: 5,
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        selfie_url: true
                                    }
                                }
                            },
                            orderBy: {
                                role: 'asc'
                            }
                        }
                    }
                }
            }
        })
        const eventsWithOverride = await Promise.all(events.map(async acc => {
            const ev = acc.event as any;
            const signedEv = await presignEventData(ev);
            return {
                ...acc,
                event: {
                    ...signedEv,
                    attendee_upload_limit: acc.upload_limit !== null && acc.upload_limit !== undefined
                        ? acc.upload_limit
                        : ev.attendee_upload_limit
                }
            }
        }))
        return res.status(200).json({ message: "Events fetched successfully", data: eventsWithOverride })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal server error";
        return res.status(500).json({ message });
    }
}

/**
 * @name updateEventDetailsController
 * @description Updates details of a particular event related to the user.
 * @route PUT /events/:eventId
 * @access Private
 */
async function updateEventDetailsController(req: AuthRequest, res: Response) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' })
        }

        const eventId = req.params.eventId as string
        const { name, date, location, isActive, isSecure } = req.body

        const event = await prisma.event.findFirst({
            where: { id: eventId, user_id: req.user.id }
        })

        if (!event) {
            return res.status(404).json({ message: 'Event not found' })
        }

        const updated = await prisma.event.update({
            where: { id: eventId },
            data: {
                ...(name && { name }),
                ...(date && { date: new Date(date) }),
                ...(location && { location }),
                ...(isActive !== undefined && { is_active: isActive }),
                ...(isSecure !== undefined && { is_secure: isSecure }),
            }
        })

        return res.status(200).json({ message: 'Event updated successfully', event: updated })

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return res.status(500).json({ message })
    }
}

/**
 * @name deleteEventController
 * @description Deletes a particular event related to the user.
 * @route DELETE /events/:eventId
 * @access Private
 */
async function deleteEventController(req: AuthRequest, res: Response) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const eventId = req.params.eventId as string;

        if (!eventId) {
            return res.status(400).json({ message: "Event ID is required" });
        }

        const event = await prisma.event.findFirst({
            where: {
                id: eventId,
                user_id: req.user.id,
            },
        });

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        // Fetch all photos to delete from R2 before removing DB records
        const photos = await prisma.photo.findMany({
            where: { event_id: eventId },
            select: { thumb_url: true, display_url: true, original_url: true },
        });

        // Delete all photo files from R2 (3 versions per photo)
        const r2Deletions = photos.flatMap((photo) => [
            deleteFromR2(extractKeyFromUrl(photo.thumb_url)),
            deleteFromR2(extractKeyFromUrl(photo.display_url)),
            deleteFromR2(extractKeyFromUrl(photo.original_url)),
        ]);

        // Run all R2 deletions in parallel, don't fail if some are missing
        await Promise.allSettled(r2Deletions);
        console.log(`Deleted ${photos.length} photo(s) from R2 for event ${eventId}`);

        // Delete event from DB — cascades to EventAccess, Photo, PhotoFace, FaceProfile
        await prisma.event.delete({
            where: { id: eventId },
        });

        return res.status(200).json({
            message: "Event deleted successfully",
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal server error";
        return res.status(500).json({ message });
    }
}

/**
 * @name getEventsController
 * @description Gets all events for the authenticated user
 * @access Private
 */
async function getEventsController(req: AuthRequest, res: Response) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const events = await prisma.event.findMany({
            where: {
                user_id: req.user.id,
            },
            include: {
                _count: {
                    select: { event_access: true, photos: true }
                },
                photos: {
                    take: 1,
                    orderBy: { uploaded_at: 'desc' },
                    select: {
                        thumb_url: true,
                        display_url: true,
                    }
                },
                event_access: {
                    take: 5,
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                selfie_url: true
                            }
                        }
                    },
                    orderBy: {
                        role: 'asc'
                    }
                }
            }
        });

        // Add user_role as ORGANIZER since these are the user's own events
        const eventsWithRole = await Promise.all(events.map(async event => {
            const signedEvent = await presignEventData(event);
            const pendingRequestCount = await prisma.joinRequest.count({
                where: { event_id: event.id, status: 'PENDING' }
            });
            return {
                ...signedEvent,
                user_role: "ORGANIZER",
                pending_request_count: pendingRequestCount
            };
        }));

        return res.status(200).json({
            message: "Events retrieved successfully",
            events: eventsWithRole,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal server error";
        return res.status(500).json({ message });
    }
}

/**
 * @name getEventAttendeesController
 * @description Gets all attendees for a particular event
 * @route GET /events/:eventId/attendees
 * @access Private
 */
async function getEventAttendeesController(req: AuthRequest, res: Response) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' })
        }

        const eventId = req.params.eventId as string

        // Only participants of the event can see attendee list
        const access = await prisma.eventAccess.findUnique({
            where: {
                event_id_user_id: { event_id: eventId, user_id: req.user.id }
            }
        })

        if (!access) {
            return res.status(403).json({ message: 'Only participants of this event can view attendees' })
        }

        const { search } = req.query
        const searchString = typeof search === 'string' ? search : undefined

        const attendees = await prisma.eventAccess.findMany({
            where: {
                event_id: eventId,
                ...(searchString && {
                    user: {
                        OR: [
                            { name: { contains: searchString, mode: 'insensitive' } },
                            { email: { contains: searchString, mode: 'insensitive' } }
                        ]
                    }
                })
            },
            include: {
                user: {
                    select: { 
                        id: true, 
                        name: true, 
                        email: true, 
                        selfie_url: true,
                        created_at: true,
                    }
                }
            },
            orderBy: [
                { role: 'asc' }, // ORGANIZER first
                { joined_at: 'asc' }
            ]
        })

        // Fetch actual photo counts for each user in this event
        const attendeesWithCounts = await Promise.all(attendees.map(async (acc) => {
            const count = await prisma.photo.count({
                where: {
                    event_id: eventId,
                    user_id: acc.user_id
                }
            })
            return {
                ...acc,
                upload_count: count,
                user: acc.user?.selfie_url
                    ? { ...acc.user, selfie_url: await presignStoredUrl(acc.user.selfie_url, 86400) }
                    : acc.user
            }
        }))

        return res.status(200).json({
            message: 'Attendees retrieved successfully',
            data: attendeesWithCounts
        })

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error'
        return res.status(500).json({ message })
    }
}

/**
 * @name leaveEventController
 * @description Attendee leaves an event. Deletes their uploaded photos from R2 and DB,
 * unclaims their matched face profiles, and removes their EventAccess.
 */
async function leaveEventController(req: AuthRequest, res: Response) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const eventId = req.params.eventId as string;
        const userId = req.user.id;

        // Verify user is an ATTENDEE (organizers cannot leave)
        const access = await prisma.eventAccess.findUnique({
            where: { event_id_user_id: { event_id: eventId, user_id: userId } },
        });

        if (!access) {
            return res.status(404).json({ message: "You are not part of this event" });
        }

        if (access.role === 'ORGANIZER') {
            return res.status(400).json({ message: "Organizers cannot leave their own event. Delete the event instead." });
        }

        // 1. Fetch all photos uploaded by this user in the event
        const photos = await prisma.photo.findMany({
            where: { event_id: eventId, user_id: userId },
            select: { id: true, thumb_url: true, display_url: true, original_url: true },
        });

        // 2. Delete photo files from R2
        if (photos.length > 0) {
            const r2Deletions = photos.flatMap((photo) => [
                deleteFromR2(extractKeyFromUrl(photo.thumb_url)),
                deleteFromR2(extractKeyFromUrl(photo.display_url)),
                deleteFromR2(extractKeyFromUrl(photo.original_url)),
            ]);
            await Promise.allSettled(r2Deletions);
            console.log(`Deleted ${photos.length} photo(s) from R2 for user ${userId} leaving event ${eventId}`);

            // 3. Delete photos from DB (cascades to PhotoFace)
            await prisma.photo.deleteMany({
                where: { event_id: eventId, user_id: userId },
            });
        }

        // 4. Unclaim face profiles matched to this user in this event
        await prisma.faceProfile.updateMany({
            where: { event_id: eventId, claimed_by: userId },
            data: { claimed_by: null, is_claimed: false },
        });

        // 5. Delete EventAccess record
        await prisma.eventAccess.delete({
            where: { event_id_user_id: { event_id: eventId, user_id: userId } },
        });

        // 6. Delete JoinRequest record
        await prisma.joinRequest.deleteMany({
            where: { event_id: eventId, user_id: userId }
        });

        return res.status(200).json({ message: "Left event successfully" });

    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal server error";
        return res.status(500).json({ message });
    }
}

async function updateAttendeeLimitController(req: AuthRequest, res: Response) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const eventId = req.params.eventId as string;
        const attendeeId = req.params.userId as string;
        const { limit } = req.body;

        // Verify the requester is the ORGANIZER of this event
        const organizerAccess = await prisma.eventAccess.findUnique({
            where: {
                event_id_user_id: { event_id: eventId, user_id: req.user.id }
            }
        });

        if (!organizerAccess || organizerAccess.role !== 'ORGANIZER') {
            return res.status(403).json({ message: "Only the organizer can adjust upload limits" });
        }

        // Parse limit (can be null to remove individual override and fallback to event limit)
        const parsedLimit = limit !== undefined && limit !== null ? parseInt(String(limit), 10) : null;
        if (parsedLimit !== null && (isNaN(parsedLimit) || parsedLimit < 0)) {
            return res.status(400).json({ message: "Invalid upload limit" });
        }

        // Update the attendee's limit
        const updatedAccess = await prisma.eventAccess.update({
            where: {
                event_id_user_id: { event_id: eventId, user_id: attendeeId }
            },
            data: {
                upload_limit: parsedLimit
            }
        });

        return res.status(200).json({
            message: "Attendee upload limit updated successfully",
            data: updatedAccess
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal server error";
        return res.status(500).json({ message });
    }
}

/**
 * @name removeAttendeeController
 * @description Organizer removes an attendee from the event. Deletes their uploaded photos from R2 and DB,
 * unclaims their matched face profiles, and removes their EventAccess.
 */
async function removeAttendeeController(req: AuthRequest, res: Response) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const eventId = req.params.eventId as string;
        const attendeeId = req.params.userId as string;

        if (!eventId || !attendeeId) {
            return res.status(400).json({ message: "Event ID and Attendee ID are required" });
        }

        // Verify the requester is the ORGANIZER of this event
        const organizerAccess = await prisma.eventAccess.findUnique({
            where: {
                event_id_user_id: { event_id: eventId, user_id: req.user.id }
            }
        });

        if (!organizerAccess || organizerAccess.role !== 'ORGANIZER') {
            return res.status(403).json({ message: "Only the organizer can remove attendees" });
        }

        // Verify the target user is part of this event and is an ATTENDEE (organizers cannot be removed)
        const targetAccess = await prisma.eventAccess.findUnique({
            where: {
                event_id_user_id: { event_id: eventId, user_id: attendeeId }
            },
            include: {
                event: {
                    select: { name: true }
                }
            }
        }) as any;

        if (!targetAccess) {
            return res.status(404).json({ message: "Attendee is not part of this event" });
        }

        if (targetAccess.role === 'ORGANIZER') {
            return res.status(400).json({ message: "Organizers cannot be removed from their own event" });
        }

        // 1. Fetch all photos uploaded by this user in the event
        const photos = await prisma.photo.findMany({
            where: { event_id: eventId, user_id: attendeeId },
            select: { id: true, thumb_url: true, display_url: true, original_url: true },
        });

        // 2. Delete photo files from R2
        if (photos.length > 0) {
            const r2Deletions = photos.flatMap((photo) => [
                deleteFromR2(extractKeyFromUrl(photo.thumb_url)),
                deleteFromR2(extractKeyFromUrl(photo.display_url)),
                deleteFromR2(extractKeyFromUrl(photo.original_url)),
            ]);
            await Promise.allSettled(r2Deletions);
            console.log(`Deleted ${photos.length} photo(s) from R2 for user ${attendeeId} removed from event ${eventId}`);

            // 3. Delete photos from DB (cascades to PhotoFace)
            await prisma.photo.deleteMany({
                where: { event_id: eventId, user_id: attendeeId },
            });
        }

        // 4. Unclaim face profiles matched to this user in this event
        await prisma.faceProfile.updateMany({
            where: { event_id: eventId, claimed_by: attendeeId },
            data: { claimed_by: null, is_claimed: false },
        });

        // 5. Delete EventAccess record
        await prisma.eventAccess.delete({
            where: { event_id_user_id: { event_id: eventId, user_id: attendeeId } },
        });

        // 6. Set JoinRequest status to REJECTED so they cannot request again for 48 hours
        await prisma.joinRequest.upsert({
            where: {
                event_id_user_id: { event_id: eventId, user_id: attendeeId }
            },
            update: {
                status: 'REJECTED',
                rejection_reason: 'Removed by organizer',
                updated_at: new Date()
            },
            create: {
                event_id: eventId,
                user_id: attendeeId,
                status: 'REJECTED',
                rejection_reason: 'Removed by organizer'
            }
        });

        // 7. Send notification to the removed attendee
        try {
            const notification = await prisma.notification.create({
                data: {
                    user_id: attendeeId,
                    title: "Removed from Event",
                    message: `You have been removed from the event: ${targetAccess.event.name}`,
                    type: "EVENT_REMOVE",
                    link: `/events`,
                    image_url: null
                }
            });

            // Emit real-time notification via Socket.IO
            const io = getIO();
            io.to(`user:${attendeeId}`).emit('notification:new', notification);
            io.to(`event:${eventId}`).emit('join-request:change', { eventId, userId: attendeeId, status: 'REJECTED', action: 'remove' });
        } catch (err) {
            console.error('[Notification/Socket] Failed to send removal notification:', err);
        }

        return res.status(200).json({ message: "Attendee removed successfully" });

    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal server error";
        return res.status(500).json({ message });
    }
}

/**
 * @name getJoinRequestsController
 * @description Gets all join requests for an event
 * @route GET /events/:eventId/requests
 * @access Private (Organizer only)
 */
async function getJoinRequestsController(req: AuthRequest, res: Response) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const eventId = req.params.eventId as string;
        const status = typeof req.query.status === 'string' ? req.query.status : 'PENDING';

        if (!eventId) {
            return res.status(400).json({ message: "Event ID is required" });
        }

        // Verify organizer access
        const access = await prisma.eventAccess.findUnique({
            where: {
                event_id_user_id: { event_id: eventId, user_id: req.user.id }
            }
        });

        if (!access || access.role !== 'ORGANIZER') {
            return res.status(403).json({ message: "Only the organizer can view join requests" });
        }

        const requests = await prisma.joinRequest.findMany({
            where: {
                event_id: eventId,
                status: status as any
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        selfie_url: true,
                        created_at: true
                    }
                }
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        // Presign selfies for the requests
        const requestsWithPresigned = await Promise.all(requests.map(async (r) => {
            if (r.user?.selfie_url) {
                return {
                    ...r,
                    user: {
                        ...r.user,
                        selfie_url: await presignStoredUrl(r.user.selfie_url, 86400)
                    }
                };
            }
            return r;
        }));

        return res.status(200).json({
            message: "Join requests retrieved successfully",
            data: requestsWithPresigned
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal server error";
        return res.status(500).json({ message });
    }
}

/**
 * @name handleJoinRequestController
 * @description Approves or rejects a join request
 * @route PUT /events/:eventId/requests/:requestId
 * @access Private (Organizer only)
 */
async function handleJoinRequestController(req: AuthRequest, res: Response) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const eventId = req.params.eventId as string;
        const requestId = req.params.requestId as string;
        const { action, reason } = req.body;

        if (!eventId || !requestId) {
            return res.status(400).json({ message: "Event ID and Request ID are required" });
        }

        if (action !== 'approve' && action !== 'reject') {
            return res.status(400).json({ message: "Invalid action. Use 'approve' or 'reject'." });
        }

        // Verify organizer access
        const access = await prisma.eventAccess.findUnique({
            where: {
                event_id_user_id: { event_id: eventId, user_id: req.user.id }
            }
        });

        if (!access || access.role !== 'ORGANIZER') {
            return res.status(403).json({ message: "Only the organizer can handle join requests" });
        }

        // Get the join request
        const joinRequest = await prisma.joinRequest.findUnique({
            where: { id: requestId },
            include: {
                event: {
                    select: { name: true, user_id: true }
                },
                user: {
                    select: { name: true, selfie_url: true }
                }
            }
        }) as any;

        if (!joinRequest || joinRequest.event_id !== eventId) {
            return res.status(404).json({ message: "Join request not found" });
        }

        if (joinRequest.status !== 'PENDING') {
            return res.status(400).json({ message: `Request is already ${joinRequest.status}` });
        }

        if (action === 'approve') {
            // Update request status
            await prisma.joinRequest.update({
                where: { id: requestId },
                data: { status: 'APPROVED' }
            });

            // Create EventAccess
            const eventAccess = await prisma.eventAccess.create({
                data: {
                    event_id: eventId,
                    user_id: joinRequest.user_id,
                    role: 'ATTENDEE'
                }
            });

            // Send notification to the attendee
            try {
                const notification = await prisma.notification.create({
                    data: {
                        user_id: joinRequest.user_id,
                        title: "Request Approved",
                        message: `Your request to join ${joinRequest.event.name} has been approved`,
                        type: "JOIN_APPROVED",
                        link: `/events/${eventId}`,
                        image_url: joinRequest.user.selfie_url
                    }
                });

                const io = getIO();
                io.to(`user:${joinRequest.user_id}`).emit('notification:new', notification);
            } catch (err) {
                console.error('[Notification/Socket] Failed to send approval notification:', err);
            }

            // Enqueue face-matching job if user has a selfie
            const users = await prisma.$queryRaw<{ selfie_url: string | null }[]>`
                SELECT selfie_url FROM "User" 
                WHERE id = ${joinRequest.user_id}::text AND selfie_embedding IS NOT NULL
            `;
            if (users.length > 0 && users[0]?.selfie_url) {
                const presignedSelfieUrlForMatch = await presignStoredUrl(users[0].selfie_url, 1800);
                await matchingQueue.add(
                    'match-user',
                    {
                        userId: joinRequest.user_id,
                        eventId: eventId,
                        selfieUrl: presignedSelfieUrlForMatch,
                    },
                    {
                        jobId: `match-${eventId}-${joinRequest.user_id}-${Date.now()}`
                    }
                );
            }

            const io = getIO();
            io.to(`user:${req.user.id}`).emit('join_request:handled', { eventId, requestId, action });
            io.to(`event:${eventId}`).emit('join-request:change', { eventId, requestId, action, status: 'APPROVED', userId: joinRequest.user_id });

            return res.status(200).json({
                message: "Join request approved successfully",
                data: eventAccess
            });

        } else {
            // Action is reject
            await prisma.joinRequest.update({
                where: { id: requestId },
                data: {
                    status: 'REJECTED',
                    rejection_reason: reason || null
                }
            });

            // Send notification to the attendee
            try {
                const notification = await prisma.notification.create({
                    data: {
                        user_id: joinRequest.user_id,
                        title: "Request Declined",
                        message: `Your request to join ${joinRequest.event.name} was declined${reason ? `: ${reason}` : ''}`,
                        type: "JOIN_REJECTED",
                        link: `/events`,
                        image_url: null
                    }
                });

                const io = getIO();
                io.to(`user:${joinRequest.user_id}`).emit('notification:new', notification);
            } catch (err) {
                console.error('[Notification/Socket] Failed to send rejection notification:', err);
            }

            const io = getIO();
            io.to(`user:${req.user.id}`).emit('join_request:handled', { eventId, requestId, action });
            io.to(`event:${eventId}`).emit('join-request:change', { eventId, requestId, action, status: 'REJECTED', userId: joinRequest.user_id });

            return res.status(200).json({
                message: "Join request rejected successfully"
            });
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal server error";
        return res.status(500).json({ message });
    }
}

/**
 * @name getPendingRequestCountController
 * @description Gets count of pending join requests for an event
 * @route GET /events/:eventId/requests/count
 * @access Private (Organizer only)
 */
async function getPendingRequestCountController(req: AuthRequest, res: Response) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const eventId = req.params.eventId as string;

        if (!eventId) {
            return res.status(400).json({ message: "Event ID is required" });
        }

        // Verify organizer access
        const access = await prisma.eventAccess.findUnique({
            where: {
                event_id_user_id: { event_id: eventId, user_id: req.user.id }
            }
        });

        if (!access || access.role !== 'ORGANIZER') {
            return res.status(403).json({ message: "Only the organizer can view request count" });
        }

        const count = await prisma.joinRequest.count({
            where: {
                event_id: eventId,
                status: 'PENDING'
            }
        });

        return res.status(200).json({ count });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal server error";
        return res.status(500).json({ message });
    }
}

export {
    createEventController,
    getEventDetailsController,
    updateEventDetailsController,
    getEventsController,
    deleteEventController,
    joinEventController,
    getJoinedEventsController,
    getEventAttendeesController,
    generateUniqueInviteCode,
    leaveEventController,
    updateAttendeeLimitController,
    removeAttendeeController,
    getJoinRequestsController,
    handleJoinRequestController,
    getPendingRequestCountController
};