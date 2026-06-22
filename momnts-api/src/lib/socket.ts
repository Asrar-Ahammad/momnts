import { Server as SocketIOServer } from 'socket.io'
import type { Server as HTTPServer } from 'http'
import Redis from 'ioredis'
import jwt from 'jsonwebtoken'
import { redisConnectionOptions, REDIS_URL } from './redis'
import { prisma } from './prisma'

let io: SocketIOServer | null = null

/**
 * Calculates and broadcasts the number of online attendees in an event room.
 * Multi-tabs for the same logged-in user are counted as 1 online user.
 * Anonymous connections (if any) are counted by socket.
 */
async function broadcastOnlineCount(eventId: string) {
  if (!io) return
  try {
    const sockets = await io.in(`event:${eventId}`).fetchSockets()
    const uniqueUserIds = new Set<string>()
    let anonymousCount = 0

    for (const s of sockets) {
      if (s.data?.userId) {
        uniqueUserIds.add(s.data.userId)
      } else {
        anonymousCount++
      }
    }

    const onlineCount = uniqueUserIds.size + anonymousCount
    
    io.to(`event:${eventId}`).emit('chat:presence', {
      eventId,
      onlineCount
    })
  } catch (err) {
    console.error(`[WS] Error broadcasting online count for event ${eventId}:`, err)
  }
}

/**
 * Initializes Socket.IO on the existing HTTP server.
 * Clients join a room named after the eventId they're viewing.
 */
export function initSocketIO(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_APP_URL || 'http://localhost:5173',
      credentials: true,
    },
  })

  // Middleware to authenticate socket connections
  io.use((socket, next) => {
    try {
      let token = socket.handshake.auth?.token || socket.handshake.query?.token as string

      // Try reading from headers if not found in auth/query
      if (!token) {
        const authHeader = socket.handshake.headers.authorization
        if (authHeader?.startsWith('Bearer ')) {
          token = authHeader.slice(7)
        }
      }

      // Fallback to cookie
      if (!token) {
        const cookieHeader = socket.handshake.headers.cookie
        if (cookieHeader) {
          const cookies = Object.fromEntries(
            cookieHeader.split(';').map(c => {
              const [key, ...value] = c.trim().split('=')
              return [key, value.join('=')]
            })
          )
          token = cookies.accessToken
        }
      }

      if (token && process.env.JWT_SECRET) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string }
        socket.data.userId = decoded.id
      }
      next()
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        console.warn(`[WS] Auth token expired for socket ${socket.id}. Connecting as anonymous.`)
      } else {
        console.error('[WS] Auth middleware error:', err)
      }
      next() // Still allow connection, but without userId
    }
  })

  io.on('connection', (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`)

    // Client sends { eventId } to join that event's room
    socket.on('join-event', async (eventId: string) => {
      socket.join(`event:${eventId}`)
      console.log(`[WS] ${socket.id} joined room event:${eventId}`)
      await broadcastOnlineCount(eventId)
    })

    socket.on('leave-event', async (eventId: string) => {
      socket.leave(`event:${eventId}`)
      console.log(`[WS] ${socket.id} left room event:${eventId}`)
      await broadcastOnlineCount(eventId)
    })

    socket.on('chat:get-presence', async (data: { eventId: string }) => {
      if (!data?.eventId) return
      await broadcastOnlineCount(data.eventId)
    })

    socket.on('chat:typing', (data: { eventId: string; isTyping: boolean; user: { name: string; selfie_url: string | null } }) => {
      const authUserId = socket.data.userId
      if (!authUserId || !data.eventId) return

      socket.broadcast.to(`event:${data.eventId}`).emit('chat:typing', {
        eventId: data.eventId,
        userId: authUserId,
        user: {
          id: authUserId,
          name: data.user?.name || 'Guest',
          selfie_url: data.user?.selfie_url || null
        },
        isTyping: data.isTyping,
        timestamp: Date.now()
      })
    })

    socket.on('chat:read', async (data: { eventId: string; messageId: string }) => {
      const authUserId = socket.data.userId
      if (!authUserId || !data.eventId || !data.messageId) return

      try {
        await prisma.eventAccess.update({
          where: {
            event_id_user_id: {
              event_id: data.eventId,
              user_id: authUserId
            }
          },
          data: {
            last_read_message_id: data.messageId
          }
        })

        io?.to(`event:${data.eventId}`).emit('chat:read', {
          eventId: data.eventId,
          userId: authUserId,
          messageId: data.messageId
        })
      } catch (err) {
        console.error('[WS] Failed to update read message status:', err)
      }
    })

    // User joins their own private room for notifications
    socket.on('join-user', (userId: string) => {
      const authUserId = socket.data.userId
      
      if (!authUserId || authUserId !== userId) {
        console.warn(`[WS] Unauthorized join-user attempt: socket ${socket.id} tried joining user:${userId}`)
        socket.emit('join-error', { message: 'Unauthorized' })
        return
      }

      socket.join(`user:${authUserId}`)
      console.log(`[WS] ${socket.id} joined private room user:${authUserId}`)
    })

    socket.on('disconnecting', () => {
      const rooms = Array.from(socket.rooms)
      for (const room of rooms) {
        if (room.startsWith('event:')) {
          const eventId = room.substring(6) // 'event:'.length === 6
          setTimeout(() => {
            broadcastOnlineCount(eventId)
          }, 50)
        }
      }
    })

    socket.on('disconnect', () => {
      console.log(`[WS] Client disconnected: ${socket.id}`)
    })
  })

  const subscriber = new Redis(REDIS_URL, redisConnectionOptions)

  subscriber.on('error', (err) => {
    console.error('[WS] Redis subscriber connection error:', err.message)
  })

  subscriber.subscribe('ws:photo-processed', 'ws:face-matched', (err) => {
    if (err) {
      console.error('[WS] Redis subscribe error:', err)
    } else {
      console.log('[WS] Subscribed to Redis channels for worker events')
    }
  })

  subscriber.on('message', (channel, message) => {
    try {
      const data = JSON.parse(message)

      if (channel === 'ws:photo-processed') {
        // Emit to all clients in the event room
        io?.to(`event:${data.eventId}`).emit('photo:processed', data)
      } else if (channel === 'ws:face-matched') {
        // Emit only to the matched user — use their userId as a sub-room
        // But since we don't track user→socket mapping, emit to event room
        // with userId so client can filter
        io?.to(`event:${data.eventId}`).emit('face:matched', data)
      }
    } catch (e) {
      console.error('[WS] Failed to parse Redis message:', e)
    }
  })

  console.log('[WS] Socket.IO initialized')
  return io
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error('Socket.IO not initialized')
  return io
}
