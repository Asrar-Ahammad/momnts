import { Server as SocketIOServer } from 'socket.io'
import type { Server as HTTPServer } from 'http'
import Redis from 'ioredis'

let io: SocketIOServer | null = null

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

  io.on('connection', (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`)

    // Client sends { eventId } to join that event's room
    socket.on('join-event', (eventId: string) => {
      socket.join(`event:${eventId}`)
      console.log(`[WS] ${socket.id} joined room event:${eventId}`)
    })

    socket.on('leave-event', (eventId: string) => {
      socket.leave(`event:${eventId}`)
      console.log(`[WS] ${socket.id} left room event:${eventId}`)
    })

    socket.on('disconnect', () => {
      console.log(`[WS] Client disconnected: ${socket.id}`)
    })
  })

  // Subscribe to Redis pub/sub for worker → server bridging
  // Workers run in separate processes, so they publish to Redis
  // and this subscriber relays to Socket.IO clients
  const subscriber = new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null,
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
