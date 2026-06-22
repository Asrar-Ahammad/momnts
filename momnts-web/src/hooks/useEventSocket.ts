import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'

interface PhotoProcessedEvent {
  eventId: string
  photoId: string
  totalFaces: number
  photo: {
    id: string
    display_url: string
    thumb_url: string
    original_url: string
    width: number | null
    height: number | null
    uploaded_at: string
    processed: boolean
  }
}

interface FaceMatchedEvent {
  eventId: string
  userId: string
  matchedPhotoCount: number
  matchedProfileIds: string[]
}

interface UseEventSocketOptions {
  eventId: string | undefined
  onPhotoProcessed?: (data: PhotoProcessedEvent) => void
  onFaceMatched?: (data: FaceMatchedEvent) => void
  onJoinRequestChange?: (data: any) => void
  onChatMessage?: (data: any) => void
}

/**
 * Hook to connect to the event's WebSocket room.
 * Receives real-time updates when photos are processed
 * and when faces are matched to the current user.
 */
export function useEventSocket({
  eventId,
  onPhotoProcessed,
  onFaceMatched,
  onJoinRequestChange,
  onChatMessage,
}: UseEventSocketOptions) {
  const socketRef = useRef<Socket | null>(null)
  const queryClient = useQueryClient()

  // Use refs for callbacks to avoid reconnecting on every render
  const onPhotoProcessedRef = useRef(onPhotoProcessed)
  const onFaceMatchedRef = useRef(onFaceMatched)
  const onJoinRequestChangeRef = useRef(onJoinRequestChange)
  const onChatMessageRef = useRef(onChatMessage)

  useEffect(() => {
    onPhotoProcessedRef.current = onPhotoProcessed
  }, [onPhotoProcessed])

  useEffect(() => {
    onFaceMatchedRef.current = onFaceMatched
  }, [onFaceMatched])

  useEffect(() => {
    onJoinRequestChangeRef.current = onJoinRequestChange
  }, [onJoinRequestChange])

  useEffect(() => {
    onChatMessageRef.current = onChatMessage
  }, [onChatMessage])

  useEffect(() => {
    if (!eventId) return

    const token = localStorage.getItem('token')
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { token },
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[WS] Connected, joining event:', eventId)
      socket.emit('join-event', eventId)
    })

    socket.on('photo:processed', (data: PhotoProcessedEvent) => {
      console.log('[WS] Photo processed:', data)
      onPhotoProcessedRef.current?.(data)
    })

    socket.on('face:matched', (data: FaceMatchedEvent) => {
      console.log('[WS] Face matched:', data)
      onFaceMatchedRef.current?.(data)
    })

    socket.on('chat:message', (data: any) => {
      console.log('[WS] Chat message received:', data)
      queryClient.setQueryData(["chats", eventId], (oldData: any) => {
        if (!oldData) return undefined
        // Don't add duplicate if sender already appended it optimistically
        if (oldData.data.some((m: any) => m.id === data.id)) return oldData

        // If there's a temporary message from the same user, replace it to avoid duplicate/flicker
        const tempIdx = oldData.data.findIndex((m: any) => m.id.startsWith("temp-") && m.user_id === data.user_id)
        if (tempIdx !== -1) {
          const newData = [...oldData.data]
          newData[tempIdx] = data
          return {
            ...oldData,
            data: newData
          }
        }

        return {
          ...oldData,
          total: oldData.total + 1,
          data: [...oldData.data, data]
        }
      })
      onChatMessageRef.current?.(data)
    })

    socket.on('chat:message-updated', (data: any) => {
      console.log('[WS] Chat message updated:', data)
      queryClient.setQueryData(["chats", eventId], (oldData: any) => {
        if (!oldData) return undefined
        return {
          total: oldData.total,
          data: oldData.data.map((m: any) => m.id === data.id ? data : m)
        }
      })
    })

    socket.on('chat:reaction-updated', (data: any) => {
      queryClient.setQueryData(["chats", eventId], (oldData: any) => {
        if (!oldData) return undefined
        return {
          total: oldData.total,
          data: oldData.data.map((m: any) => m.id === data.messageId ? { ...m, reactions: data.reactions } : m)
        }
      })
    })

    socket.on('chat:message-deleted', (data: any) => {
      console.log('[WS] Chat message deleted:', data)
      queryClient.setQueryData(["chats", eventId], (oldData: any) => {
        if (!oldData) return undefined
        const filtered = oldData.data.filter((m: any) => m.id !== data.id)
        return {
          total: filtered.length,
          data: filtered
        }
      })
    })

    socket.on('chat:read', (data: any) => {
      console.log('[WS] Chat message read:', data)
      queryClient.setQueryData(["attendees", eventId], (oldData: any) => {
        if (!oldData) return undefined
        return oldData.map((a: any) =>
          a.user_id === data.userId ? { ...a, last_read_message_id: data.messageId } : a
        )
      })
    })

    socket.on('join-request:change', (data: any) => {
      console.log('[WS] Join request changed:', data)
      queryClient.invalidateQueries({ queryKey: ["join-requests-count", eventId] })
      queryClient.invalidateQueries({ queryKey: ["join-requests", eventId] })
      queryClient.invalidateQueries({ queryKey: ["attendees", eventId] })
      queryClient.invalidateQueries({ queryKey: ["event", eventId] })
      onJoinRequestChangeRef.current?.(data)
    })

    socket.on('disconnect', () => {
      console.log('[WS] Disconnected')
    })

    return () => {
      socket.emit('leave-event', eventId)
      socket.disconnect()
      socketRef.current = null
    }
  }, [eventId, queryClient])

  return socketRef
}
