import type { Response } from "express";
import { prisma } from "../lib/prisma.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import crypto from 'crypto'
import { matchingQueue } from "../lib/queue.js";
import { deleteFromR2, extractKeyFromUrl } from "../lib/r2.js";

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
        const { name, date, location } = req.body;

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

        const event = await prisma.event.create({
            data: {
                name: name,
                date: eventDate,
                location: location,
                invite_code: invite_code,
                user_id: req.user.id,
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
        const users = await prisma.$queryRaw<any[]>`
            SELECT id FROM "User" 
            WHERE id = ${req.user.id} AND selfie_embedding IS NOT NULL
        `
        if (users.length > 0) {
            await matchingQueue.add(
                'match-user',
                {
                    userId: req.user.id,
                    eventId: event.id,
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
                }
            }
        })
        if (!event) {
            return res.status(404).json({ message: "Event not found" })
        }
        return res.status(200).json({
            event: {
                ...event,
                user_role: eventAccess.role
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

        const eventAccess = await prisma.eventAccess.create({
            data: {
                event_id: event.id,
                user_id: req.user.id,
                role: 'ATTENDEE',
            }
        })

        // Enqueue face-matching job if user has a selfie
        const users = await prisma.$queryRaw<any[]>`
            SELECT id FROM "User" 
            WHERE id = ${req.user.id}::text AND selfie_embedding IS NOT NULL
        `
        if (users.length > 0) {
            await matchingQueue.add(
                'match-user',
                {
                    userId: req.user.id,
                    eventId: event.id,
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
                            select: { event_access: true }
                        }
                    }
                }
            }
        })
        return res.status(200).json({ message: "Events fetched successfully", data: events })
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
        const { name, date, location, isActive } = req.body

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
                    select: { event_access: true }
                }
            }
        });

        // Add user_role as ORGANIZER since these are the user's own events
        const eventsWithRole = events.map(event => ({
            ...event,
            user_role: "ORGANIZER"
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

        // Only organizer can see attendee list
        const access = await prisma.eventAccess.findUnique({
            where: {
                event_id_user_id: { event_id: eventId, user_id: req.user.id }
            }
        })

        if (!access || access.role !== 'ORGANIZER') {
            return res.status(403).json({ message: 'Only the organizer can view attendees' })
        }

        const attendees = await prisma.eventAccess.findMany({
            where: { event_id: eventId },
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
                upload_count: count
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

        return res.status(200).json({ message: "Left event successfully" });

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
    leaveEventController
};