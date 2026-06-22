import type { Response } from "express";
import { prisma } from "../lib/prisma.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import { getIO } from "../lib/socket.js";
import { presignStoredUrl } from "../lib/r2.js";

/**
 * @name getCommentsController
 * @description Get all comments for a photo
 * @route GET /api/photos/:photoId/comments
 * @access Private
 */
export async function getCommentsController(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { photoId } = req.params as { photoId: string };

    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
    });

    if (!photo) {
      return res.status(404).json({ message: "Photo not found" });
    }

    const eventAccess = await prisma.eventAccess.findUnique({
      where: {
        event_id_user_id: {
          event_id: photo.event_id,
          user_id: req.user.id,
        },
      },
    });

    if (!eventAccess) {
      return res.status(403).json({ message: "You do not have access to this event" });
    }

    const comments = await prisma.comment.findMany({
      where: {
        photo_id: photoId,
        parent_id: null,
      },
      include: {
        user: { select: { id: true, name: true, selfie_url: true } },
        replies: {
          include: {
            user: { select: { id: true, name: true, selfie_url: true } },
          },
          orderBy: { created_at: "asc" },
        },
      },
      orderBy: { created_at: "asc" },
    });

    const signedComments = await Promise.all(comments.map(async (c) => ({
      ...c,
      user: {
        ...c.user,
        selfie_url: c.user.selfie_url ? await presignStoredUrl(c.user.selfie_url, 86400) : null
      },
      replies: await Promise.all(c.replies.map(async (r) => ({
        ...r,
        user: {
          ...r.user,
          selfie_url: r.user.selfie_url ? await presignStoredUrl(r.user.selfie_url, 86400) : null
        }
      })))
    })));

    return res.status(200).json({
      total: comments.length,
      data: signedComments,
    });
  } catch (error) {
    console.error("[getCommentsController] Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * @name addCommentController
 * @description Add a new comment or reply to a photo
 * @route POST /api/photos/:photoId/comments
 * @access Private
 */
export async function addCommentController(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { photoId } = req.params as { photoId: string };
    const { text, parent_id: rawParentId } = req.body;
    const parent_id = typeof rawParentId === "string" && rawParentId.trim() !== "" ? rawParentId : null;

    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
    });

    if (!photo) {
      return res.status(404).json({ message: "Photo not found" });
    }

    const eventAccess = await prisma.eventAccess.findUnique({
      where: {
        event_id_user_id: {
          event_id: photo.event_id,
          user_id: req.user.id,
        },
      },
    });

    if (!eventAccess) {
      return res.status(403).json({ message: "You do not have access to this event" });
    }

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    if (text.length > 500) {
      return res.status(400).json({ message: "Comment cannot exceed 500 characters" });
    }

    if (parent_id) {
      const parent = await prisma.comment.findUnique({
        where: { id: parent_id },
      });

      if (!parent) {
        return res.status(400).json({ message: "Parent comment not found" });
      }

      if (parent.photo_id !== photoId) {
        return res.status(400).json({ message: "Cannot reply to comment on a different photo" });
      }

      if (parent.parent_id !== null) {
        return res.status(400).json({ message: "Cannot reply to a reply" });
      }
    }

    const comment = await prisma.comment.create({
      data: {
        photo_id: photoId,
        user_id: req.user.id,
        text: text.trim(),
        parent_id: parent_id,
      },
      include: {
        user: { select: { id: true, name: true, selfie_url: true } },
        replies: {
          include: {
            user: { select: { id: true, name: true, selfie_url: true } },
          },
        },
      },
    });

    // Non-blocking notification & webhook dispatch
    try {
      const attendees = await prisma.eventAccess.findMany({
        where: { event_id: photo.event_id },
        include: {
          user: {
            select: { id: true, name: true }
          }
        }
      });

      const sortedAttendees = [...attendees].sort((a, b) => b.user.name.length - a.user.name.length);
      const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      const mentionedUserIds: string[] = [];
      let textToSearch = comment.text;

      for (const attendee of sortedAttendees) {
        if (attendee.user_id === req.user.id) continue;

        const namePattern = escapeRegExp(attendee.user.name);
        const regex = new RegExp(`(?:^|\\s)@(${namePattern})(?:$|\\s|[.,!?;:])`, 'i');

        if (regex.test(textToSearch)) {
          mentionedUserIds.push(attendee.user_id);
          textToSearch = textToSearch.replace(new RegExp(`@${namePattern}`, 'gi'), '');
        }
      }

      const authorName = comment.user.name;
      const authorSelfie = comment.user.selfie_url;

      for (const userId of mentionedUserIds) {
        // Create DB notification
        const notification = await prisma.notification.create({
          data: {
            user_id: userId,
            title: "New Mention",
            message: `${authorName} mentioned you in a comment`,
            type: "MENTION",
            link: `/events/${photo.event_id}?photoId=${photoId}&commentId=${comment.id}`,
            image_url: authorSelfie || null
          }
        });

        // Real-time socket emit
        try {
          const io = getIO();
          io.to(`user:${userId}`).emit('notification:new', notification);
        } catch (socketErr) {
          console.error("[comments.controller] Socket emit failed:", socketErr);
        }

        // Webhook dispatch
        const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL;
        if (webhookUrl) {
          fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'notification.created',
              data: {
                notificationId: notification.id,
                userId: notification.user_id,
                title: notification.title,
                message: notification.message,
                type: notification.type,
                link: notification.link,
                image_url: notification.image_url,
                created_at: notification.created_at
              }
            })
          }).catch(webhookErr => {
            console.error("[comments.controller] Webhook call failed:", webhookErr);
          });
        }
      }

      // Notify the photo owner if they are not the commenter and not already mentioned
      if (photo.user_id !== req.user.id && !mentionedUserIds.includes(photo.user_id)) {
        // Create DB notification
        const notification = await prisma.notification.create({
          data: {
            user_id: photo.user_id,
            title: "New Comment",
            message: `${authorName} commented on your photo`,
            type: "COMMENT",
            link: `/events/${photo.event_id}?photoId=${photoId}&commentId=${comment.id}`,
            image_url: authorSelfie || null
          }
        });

        // Real-time socket emit
        try {
          const io = getIO();
          io.to(`user:${photo.user_id}`).emit('notification:new', notification);
        } catch (socketErr) {
          console.error("[comments.controller] Socket emit failed for photo owner:", socketErr);
        }

        // Webhook dispatch
        const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL;
        if (webhookUrl) {
          fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'notification.created',
              data: {
                notificationId: notification.id,
                userId: notification.user_id,
                title: notification.title,
                message: notification.message,
                type: notification.type,
                link: notification.link,
                image_url: notification.image_url,
                created_at: notification.created_at
              }
            })
          }).catch(webhookErr => {
            console.error("[comments.controller] Webhook call failed for photo owner:", webhookErr);
          });
        }
      }
    } catch (notifErr) {
      console.error("[comments.controller] Failed to process mentions/notifications:", notifErr);
    }

    const signedComment = {
      ...comment,
      user: {
        ...comment.user,
        selfie_url: comment.user.selfie_url ? await presignStoredUrl(comment.user.selfie_url, 86400) : null
      },
      replies: await Promise.all(comment.replies.map(async (r) => ({
        ...r,
        user: {
          ...r.user,
          selfie_url: r.user.selfie_url ? await presignStoredUrl(r.user.selfie_url, 86400) : null
        }
      })))
    };

    return res.status(201).json({
      message: "Comment added",
      data: signedComment,
    });
  } catch (error) {
    console.error("[addCommentController] Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * @name deleteCommentController
 * @description Delete a comment or reply
 * @route DELETE /api/photos/:photoId/comments/:commentId
 * @access Private
 */
export async function deleteCommentController(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { photoId, commentId } = req.params as { photoId: string; commentId: string };

    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
    });

    if (!photo) {
      return res.status(404).json({ message: "Photo not found" });
    }

    const eventAccess = await prisma.eventAccess.findUnique({
      where: {
        event_id_user_id: {
          event_id: photo.event_id,
          user_id: req.user.id,
        },
      },
    });

    if (!eventAccess) {
      return res.status(403).json({ message: "You do not have access to this event" });
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (comment.photo_id !== photoId) {
      return res.status(400).json({ message: "Comment does not belong to this photo" });
    }

    if (eventAccess.role !== "ORGANIZER" && comment.user_id !== req.user.id) {
      return res.status(403).json({ message: "You do not have permission to delete this comment" });
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    return res.status(200).json({
      message: "Comment deleted",
    });
  } catch (error) {
    console.error("[deleteCommentController] Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
