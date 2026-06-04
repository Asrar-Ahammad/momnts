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
}: UseEventSocketOptions) {
  const socketRef = useRef<Socket | null>(null)
  const queryClient = useQueryClient()

  // Use refs for callbacks to avoid reconnecting on every render
  const onPhotoProcessedRef = useRef(onPhotoProcessed)
  const onFaceMatchedRef = useRef(onFaceMatched)
  const onJoinRequestChangeRef = useRef(onJoinRequestChange)

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
