import type { Response } from "express";
import { prisma } from "../lib/prisma.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";

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

        return res.status(200).json({
            message: "Notifications retrieved successfully",
            notifications,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal server error";
        return res.status(500).json({ message });
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
        const message = error instanceof Error ? error.message : "Internal server error";
        return res.status(500).json({ message });
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
        const message = error instanceof Error ? error.message : "Internal server error";
        return res.status(500).json({ message });
    }
}

export {
    getNotificationsController,
    markAsReadController,
    clearNotificationsController
};
