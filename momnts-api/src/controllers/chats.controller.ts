import type { Response } from "express";
import { prisma } from "../lib/prisma.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import { getIO } from "../lib/socket.js";
import { presignStoredUrl } from "../lib/r2.js";

/**
 * @name getChatMessagesController
 * @description Fetch all chat messages for a secure event
 * @route GET /api/events/:eventId/chats
 * @access Private
 */
export async function getChatMessagesController(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { eventId } = req.params as { eventId: string };

    // 1. Verify user event access
    const eventAccess = await prisma.eventAccess.findUnique({
      where: {
        event_id_user_id: {
          event_id: eventId,
          user_id: req.user.id,
        },
      },
    });

    if (!eventAccess) {
      return res.status(403).json({ message: "You do not have access to this event" });
    }

    const cursor = req.query.cursor as string | undefined;
    const limit = 50;

    // 2. Fetch messages (newest first for pagination)
    const messages = await prisma.chatMessage.findMany({
      where: { event_id: eventId },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        user: { select: { id: true, name: true, selfie_url: true } },
        photos: { select: { id: true, thumb_url: true, display_url: true, encryption_iv: true, encryption_tag: true } },
        parent: {
          include: {
            user: { select: { id: true, name: true } }
          }
        },
        reactions: {
          include: {
            user: { select: { id: true, name: true, selfie_url: true } }
          }
        }
      },
      orderBy: { created_at: "desc" },
    });

    let nextCursor: string | null = null;
    if (messages.length > limit) {
      const nextMessage = messages.pop();
      nextCursor = nextMessage!.id;
    }

    // Restore chronological order (oldest first) for the client
    messages.reverse();

    // 3. Presign URLs for user selfies & tagged photos (optimized with memoization)
    const presignCache = new Map<string, string>();
    const memoizedPresign = async (url: string | null | undefined, expiresIn: number) => {
      if (!url) return null;
      const key = `${url}-${expiresIn}`;
      if (presignCache.has(key)) return presignCache.get(key)!;
      const signed = await presignStoredUrl(url, expiresIn);
      presignCache.set(key, signed);
      return signed;
    };

    const signedMessages = await Promise.all(
      messages.map(async (msg) => {
        const signedSelfie = await memoizedPresign(msg.user.selfie_url, 86400);

        let signedPhotos: any[] = [];
        if (msg.photos && msg.photos.length > 0) {
          signedPhotos = await Promise.all(
            msg.photos.map(async (photo) => ({
              id: photo.id,
              thumb_url: await memoizedPresign(photo.thumb_url, 3600),
              display_url: await memoizedPresign(photo.display_url, 3600),
              encryption_iv: photo.encryption_iv,
              encryption_tag: photo.encryption_tag,
            }))
          );
        }

        const signedReactions = await Promise.all(
          msg.reactions.map(async (reaction) => ({
            ...reaction,
            user: {
              ...reaction.user,
              selfie_url: await memoizedPresign(reaction.user.selfie_url, 86400),
            }
          }))
        );

        return {
          ...msg,
          user: {
            ...msg.user,
            selfie_url: signedSelfie,
          },
          photos: signedPhotos,
          reactions: signedReactions,
        };
      })
    );

    return res.status(200).json({
      total: signedMessages.length,
      data: signedMessages,
      nextCursor,
    });
  } catch (error) {
    console.error("[getChatMessagesController] Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * @name sendChatMessageController
 * @description Post a new E2EE encrypted chat message to an event
 * @route POST /api/events/:eventId/chats
 * @access Private
 */
export async function sendChatMessageController(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { eventId } = req.params as { eventId: string };
    const { message_text, encryption_iv, encryption_tag, photo_ids, mentions, parent_id } = req.body;

    // 1. Verify user event access
    const eventAccess = await prisma.eventAccess.findUnique({
      where: {
        event_id_user_id: {
          event_id: eventId,
          user_id: req.user.id,
        },
      },
    });

    if (!eventAccess) {
      return res.status(403).json({ message: "You do not have access to this event" });
    }

    // 2. Validate input parameters
    if (typeof message_text !== 'string' || !message_text.trim() || message_text.length > 2000) {
      return res.status(400).json({ message: "Invalid message_text. Must be a string up to 2000 characters." });
    }
    if (typeof encryption_iv !== 'string' || !encryption_iv.trim() || typeof encryption_tag !== 'string' || !encryption_tag.trim()) {
      return res.status(400).json({ message: "Invalid encryption parameters. Must be non-empty strings." });
    }

    // 3. Verify tagged photos belong to this event
    if (Array.isArray(photo_ids) && photo_ids.length > 0) {
      const photos = await prisma.photo.findMany({
        where: { id: { in: photo_ids } },
      });
      if (photos.length !== photo_ids.length || photos.some(p => p.event_id !== eventId)) {
        return res.status(400).json({ message: "One or more tagged photos not found in this event." });
      }
    }

    // Verify parent message belongs to this event
    if (parent_id) {
      const parentMessage = await prisma.chatMessage.findUnique({
        where: { id: parent_id },
      });
      if (!parentMessage || parentMessage.event_id !== eventId) {
        return res.status(400).json({ message: "Parent message not found in this event." });
      }
    }

    // 4. Create chat message
    const message = await prisma.chatMessage.create({
      data: {
        event_id: eventId,
        user_id: req.user.id,
        parent_id: parent_id || null,
        message_text,
        encryption_iv,
        encryption_tag,
        photos: {
          connect: Array.isArray(photo_ids) ? photo_ids.map(id => ({ id })) : []
        }
      },
      include: {
        user: { select: { id: true, name: true, selfie_url: true } },
        photos: { select: { id: true, thumb_url: true, display_url: true, encryption_iv: true, encryption_tag: true } },
        parent: {
          include: {
            user: { select: { id: true, name: true } }
          }
        },
        reactions: {
          include: {
            user: { select: { id: true, name: true, selfie_url: true } }
          }
        }
      },
    });

    // 5. Presign URLs for output & websocket broadcasting
    const signedSelfie = message.user.selfie_url
      ? await presignStoredUrl(message.user.selfie_url, 86400)
      : null;

    let signedPhotos: any[] = [];
    if (message.photos && message.photos.length > 0) {
      signedPhotos = await Promise.all(
        message.photos.map(async (photo) => ({
          id: photo.id,
          thumb_url: await presignStoredUrl(photo.thumb_url, 3600),
          display_url: await presignStoredUrl(photo.display_url, 3600),
          encryption_iv: photo.encryption_iv,
          encryption_tag: photo.encryption_tag,
        }))
      );
    }

    const broadcastMessage = {
      ...message,
      user: {
        ...message.user,
        selfie_url: signedSelfie,
      },
      photos: signedPhotos,
    };

    // 6. Broadcast via Socket.IO
    try {
      const io = getIO();
      io.to(`event:${eventId}`).emit("chat:message", broadcastMessage);
    } catch (socketErr) {
      console.error("[sendChatMessageController] Socket broadcast error:", socketErr);
    }

    // 7. Dispatch mentions notifications
    if (Array.isArray(mentions) && mentions.length > 0) {
      try {
        const io = getIO();
        const authorName = req.user.name;
        const authorSelfie = message.user.selfie_url;

        // Deduplicate mentions to prevent duplicate notifications
        const uniqueMentions = [...new Set(mentions)];

        const everyoneUserIds = new Set<string>();
        const hasEveryone = uniqueMentions.includes("everyone");

        if (hasEveryone) {
          const allAccesses = await prisma.eventAccess.findMany({
            where: {
              event_id: eventId,
              user_id: { not: req.user.id }
            },
            select: { user_id: true }
          });
          allAccesses.forEach(a => everyoneUserIds.add(a.user_id));
        }

        const directMentions = uniqueMentions.filter(m => m !== "everyone");
        const targets = new Map<string, { isEveryone: boolean }>();

        for (const uid of directMentions) {
          if (uid !== req.user.id) {
            targets.set(uid, { isEveryone: false });
          }
        }

        for (const uid of everyoneUserIds) {
          if (!targets.has(uid)) {
            targets.set(uid, { isEveryone: true });
          }
        }

        if (targets.size > 0) {
          const targetUserIds = Array.from(targets.keys());

          // Fetch user event roles in bulk to check for ATTENDEE status
          const userAccesses = await prisma.eventAccess.findMany({
            where: {
              event_id: eventId,
              user_id: { in: targetUserIds },
            },
          });
          const userRoleMap = new Map(userAccesses.map((ua) => [ua.user_id, ua.role]));

          for (const [userId, info] of targets.entries()) {
            if (!userRoleMap.has(userId)) continue;

            const title = info.isEveryone ? "Everyone Tag" : "New Mention";
            const msgText = info.isEveryone
              ? `${authorName} mentioned everyone in a chat`
              : `${authorName} mentioned you in a chat`;

            // Create DB notification
            const notification = await prisma.notification.create({
              data: {
                user_id: userId,
                title,
                message: msgText,
                type: "MENTION",
                link: `/events/${eventId}`,
                image_url: authorSelfie || null
              }
            });

            // Check if recipient is an ATTENDEE in this event
            const role = userRoleMap.get(userId);
            const isAttendee = role === "ATTENDEE";

            // Real-time socket emit with skipToast flag
            try {
              io.to(`user:${userId}`).emit('notification:new', {
                ...notification,
                skipToast: isAttendee,
              });
            } catch (socketErr) {
              console.error("[sendChatMessageController] Notification Socket emit failed:", socketErr);
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
                console.error("[sendChatMessageController] Webhook call failed:", webhookErr);
              });
            }
          }
        }
      } catch (notifErr) {
        console.error("[sendChatMessageController] Failed to process mentions/notifications:", notifErr);
      }
    }

    return res.status(201).json({
      message: "Chat message sent",
      data: broadcastMessage,
    });
  } catch (error) {
    console.error("[sendChatMessageController] Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * @name updateChatMessageController
 * @description Update an existing E2EE encrypted chat message
 * @route PUT /api/events/:eventId/chats/:messageId
 * @access Private
 */
export async function updateChatMessageController(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { eventId, messageId } = req.params as { eventId: string; messageId: string };
    const { message_text, encryption_iv, encryption_tag } = req.body;

    // 1. Verify user event access
    const eventAccess = await prisma.eventAccess.findUnique({
      where: {
        event_id_user_id: {
          event_id: eventId,
          user_id: req.user.id,
        },
      },
    });

    if (!eventAccess) {
      return res.status(403).json({ message: "You do not have access to this event" });
    }

    if (typeof message_text !== 'string' || !message_text.trim() || message_text.length > 2000) {
      return res.status(400).json({ message: "Invalid message_text. Must be a string up to 2000 characters." });
    }
    if (typeof encryption_iv !== 'string' || !encryption_iv.trim() || typeof encryption_tag !== 'string' || !encryption_tag.trim()) {
      return res.status(400).json({ message: "Invalid encryption parameters. Must be non-empty strings." });
    }

    // 2. Fetch message and verify ownership
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message || message.event_id !== eventId) {
      return res.status(404).json({ message: "Chat message not found." });
    }

    if (message.user_id !== req.user.id) {
      return res.status(403).json({ message: "You are not authorized to edit this message." });
    }

    // 3. Verify 15-minute time limit for editing
    const timeElapsed = Date.now() - new Date(message.created_at).getTime();
    if (timeElapsed > 15 * 60 * 1000) {
      return res.status(403).json({ message: "Messages can only be edited up to 15 minutes after they are sent." });
    }

    // 4. Update message
    const updatedMessage = await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        message_text,
        encryption_iv,
        encryption_tag,
      },
      include: {
        user: { select: { id: true, name: true, selfie_url: true } },
        photos: { select: { id: true, thumb_url: true, display_url: true, encryption_iv: true, encryption_tag: true } },
        parent: {
          include: {
            user: { select: { id: true, name: true } }
          }
        },
        reactions: {
          include: {
            user: { select: { id: true, name: true, selfie_url: true } }
          }
        }
      },
    });

    // 4. Presign URLs for output & broadcasting
    const signedSelfie = updatedMessage.user.selfie_url
      ? await presignStoredUrl(updatedMessage.user.selfie_url, 86400)
      : null;

    let signedPhotos: any[] = [];
    if (updatedMessage.photos && updatedMessage.photos.length > 0) {
      signedPhotos = await Promise.all(
        updatedMessage.photos.map(async (photo) => ({
          id: photo.id,
          thumb_url: await presignStoredUrl(photo.thumb_url, 3600),
          display_url: await presignStoredUrl(photo.display_url, 3600),
          encryption_iv: photo.encryption_iv,
          encryption_tag: photo.encryption_tag,
        }))
      );
    }

    const broadcastMessage = {
      ...updatedMessage,
      user: {
        ...updatedMessage.user,
        selfie_url: signedSelfie,
      },
      photos: signedPhotos,
    };

    // 5. Broadcast updated message via Socket.IO
    try {
      const io = getIO();
      io.to(`event:${eventId}`).emit("chat:message-updated", broadcastMessage);
    } catch (socketErr) {
      console.error("[updateChatMessageController] Socket broadcast error:", socketErr);
    }

    return res.status(200).json({
      message: "Chat message updated",
      data: broadcastMessage,
    });
  } catch (error) {
    console.error("[updateChatMessageController] Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * @name deleteChatMessageController
 * @description Delete an existing chat message
 * @route DELETE /api/events/:eventId/chats/:messageId
 * @access Private
 */
export async function deleteChatMessageController(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { eventId, messageId } = req.params as { eventId: string; messageId: string };

    // 1. Verify user event access
    const eventAccess = await prisma.eventAccess.findUnique({
      where: {
        event_id_user_id: {
          event_id: eventId,
          user_id: req.user.id,
        },
      },
    });

    if (!eventAccess) {
      return res.status(403).json({ message: "You do not have access to this event" });
    }

    // 2. Fetch message and verify permissions (author or organizer)
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message || message.event_id !== eventId) {
      return res.status(404).json({ message: "Chat message not found." });
    }

    const isAuthor = message.user_id === req.user.id;
    const isOrganizer = eventAccess.role === "ORGANIZER";

    if (!isAuthor && !isOrganizer) {
      return res.status(403).json({ message: "You are not authorized to delete this message." });
    }

    // 3. Delete message
    await prisma.chatMessage.delete({
      where: { id: messageId },
    });

    // 4. Broadcast deleted message ID via Socket.IO
    try {
      const io = getIO();
      io.to(`event:${eventId}`).emit("chat:message-deleted", { id: messageId });
    } catch (socketErr) {
      console.error("[deleteChatMessageController] Socket broadcast error:", socketErr);
    }

    return res.status(200).json({
      message: "Chat message deleted",
    });
  } catch (error) {
    console.error("[deleteChatMessageController] Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * @name toggleMessageReactionController
 * @description Add or remove a reaction to a chat message
 * @route POST /api/events/:eventId/chats/:messageId/reactions
 * @access Private
 */
export async function toggleMessageReactionController(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { eventId, messageId } = req.params as { eventId: string; messageId: string };
    const { emoji } = req.body;

    if (typeof emoji !== 'string' || !emoji.trim() || emoji.length > 20) {
      return res.status(400).json({ message: "Invalid emoji format or length." });
    }

    // 1. Verify user event access
    const eventAccess = await prisma.eventAccess.findUnique({
      where: {
        event_id_user_id: {
          event_id: eventId,
          user_id: req.user.id,
        },
      },
    });

    if (!eventAccess) {
      return res.status(403).json({ message: "You do not have access to this event" });
    }

    // 2. Fetch message to ensure it exists
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message || message.event_id !== eventId) {
      return res.status(404).json({ message: "Chat message not found." });
    }

    // 3. Toggle reaction with catch-and-retry to handle concurrent race conditions
    let action = "added";
    let retryCount = 0;
    
    while (retryCount < 2) {
      try {
        const existingReaction = await prisma.messageReaction.findUnique({
          where: {
            chat_message_id_user_id: {
              chat_message_id: messageId,
              user_id: req.user.id,
            },
          },
        });

        if (existingReaction) {
          if (existingReaction.emoji === emoji) {
            // Toggle off: user clicked the same emoji
            await prisma.messageReaction.delete({
              where: { id: existingReaction.id },
            });
            action = "removed";
          } else {
            // Replace with new emoji
            await prisma.messageReaction.update({
              where: { id: existingReaction.id },
              data: { emoji },
            });
            action = "replaced";
          }
        } else {
          // Add reaction
          await prisma.messageReaction.create({
            data: {
              chat_message_id: messageId,
              user_id: req.user.id,
              emoji,
            },
          });
          action = "added";
        }
        break; // Success, break out of retry loop
      } catch (err: any) {
        // P2002: Unique constraint failed (racing creates)
        // P2025: Record to update/delete not found (racing deletes)
        if (err.code === 'P2002' || err.code === 'P2025') {
          retryCount++;
          if (retryCount >= 2) throw err; // Give up after retrying
          // Loop continues and retries the read-then-write flow
        } else {
          throw err;
        }
      }
    }

    // 4. Broadcast updated reaction via Socket.IO
    try {
      const io = getIO();
      const updatedMessage = await prisma.chatMessage.findUnique({
        where: { id: messageId },
        include: {
          reactions: {
            include: {
              user: { select: { id: true, name: true, selfie_url: true } }
            }
          }
        },
      });
      
      if (updatedMessage) {
        const signedReactions = await Promise.all(
          updatedMessage.reactions.map(async (reaction) => ({
            ...reaction,
            user: {
              ...reaction.user,
              selfie_url: reaction.user.selfie_url ? await presignStoredUrl(reaction.user.selfie_url, 86400) : null,
            }
          }))
        );

        io.to(`event:${eventId}`).emit("chat:reaction-updated", { 
          messageId, 
          reactions: signedReactions 
        });
      }
    } catch (socketErr) {
      console.error("[toggleMessageReactionController] Socket broadcast error:", socketErr);
    }

    return res.status(200).json({
      message: `Reaction ${action}`,
    });
  } catch (error) {
    console.error("[toggleMessageReactionController] Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
