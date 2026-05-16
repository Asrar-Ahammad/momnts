import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { NotificationData } from '../features/notifications/services/notifications.api'

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'

interface UseNotificationSocketOptions {
  userId: string | undefined
  onNotificationReceived?: (notification: NotificationData) => void
}

export function useNotificationSocket({
  userId,
  onNotificationReceived,
}: UseNotificationSocketOptions) {
  const socketRef = useRef<Socket | null>(null)
  const onNotificationReceivedRef = useRef(onNotificationReceived)

  useEffect(() => {
    onNotificationReceivedRef.current = onNotificationReceived
  }, [onNotificationReceived])

  useEffect(() => {
    if (!userId) return

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[WS] Connected to notifications, joining user:', userId)
      socket.emit('join-user', userId)
    })

    socket.on('notification:new', (notification: NotificationData) => {
      console.log('[WS] New notification received:', notification)
      onNotificationReceivedRef.current?.(notification)
    })

    socket.on('disconnect', () => {
      console.log('[WS] Notifications disconnected')
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [userId])

  return socketRef
}
