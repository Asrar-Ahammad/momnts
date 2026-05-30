import type { Response } from "express";
import { prisma } from "../lib/prisma.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";

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

    return res.status(200).json({
      total: comments.length,
      data: comments,
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

    return res.status(201).json({
      message: "Comment added",
      data: comment,
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
