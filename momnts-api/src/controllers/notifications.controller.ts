import type { Response } from "express";
import { prisma } from "../lib/prisma.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import { Prisma } from "../generated/prisma/index.js";
import { presignStoredUrl } from "../lib/r2.js";

/**
 * @name getNotificationsController
 * @description Gets all notifications for the authenticated user
 * @access Private
 */
async function getNotificationsController(req: AuthRequest, res: Response) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const notifications = await prisma.notification.findMany({
            where: {
                user_id: req.user.id,
            },
            orderBy: {
                created_at: 'desc'
            },
            take: 20
        });

        const signedNotifications = await Promise.all(notifications.map(async (n) => {
            if (n.image_url) {
                return { ...n, image_url: await presignStoredUrl(n.image_url, 86400) }
            }
            return n;
        }))

        return res.status(200).json({
            message: "Notifications retrieved successfully",
            notifications: signedNotifications,
        });
    } catch (error) {
        console.error("[getNotificationsController] Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

/**
 * @name markAsReadController
 * @description Marks a notification as read
 * @access Private
 */
async function markAsReadController(req: AuthRequest, res: Response) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const notificationId = req.params.notificationId;
        if (typeof notificationId !== 'string') return res.status(400).json({ error: 'Invalid param' })

        await prisma.notification.update({
            where: {
                id: notificationId,
                user_id: req.user.id
            },
            data: {
                is_read: true
            }
        });

        return res.status(200).json({
            message: "Notification marked as read",
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return res.status(404).json({ message: "Notification not found or not owned by user" });
        }
        console.error("[markAsReadController] Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

/**
 * @name clearNotificationsController
 * @description Deletes all notifications for the authenticated user
 * @access Private
 */
async function clearNotificationsController(req: AuthRequest, res: Response) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        await prisma.notification.deleteMany({
            where: {
                user_id: req.user.id
            }
        });

        return res.status(200).json({
            message: "All notifications cleared",
        });
    } catch (error) {
        console.error("[clearNotificationsController] Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

/**
 * @name deleteNotificationController
 * @description Deletes a specific notification for the authenticated user
 * @access Private
 */
async function deleteNotificationController(req: AuthRequest, res: Response) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const notificationId = req.params.notificationId;
        if (typeof notificationId !== 'string') return res.status(400).json({ error: 'Invalid param' })

        await prisma.notification.delete({
            where: {
                id: notificationId,
                user_id: req.user.id
            }
        });

        return res.status(200).json({
            message: "Notification deleted",
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return res.status(404).json({ message: "Notification not found or not owned by user" });
        }
        console.error("[deleteNotificationController] Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

/**
 * @name markAllAsReadController
 * @description Marks all notifications as read for the authenticated user
 * @access Private
 */
async function markAllAsReadController(req: AuthRequest, res: Response) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        await prisma.notification.updateMany({
            where: {
                user_id: req.user.id,
                is_read: false
            },
            data: {
                is_read: true
            }
        });

        return res.status(200).json({
            message: "All notifications marked as read",
        });
    } catch (error) {
        console.error("[markAllAsReadController] Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export {
    getNotificationsController,
    markAsReadController,
    markAllAsReadController,
    clearNotificationsController,
    deleteNotificationController
};
