import { useState, useEffect, useCallback, useRef } from 'react'
import { Bell, UserPlus, Calendar, Info, Check, X, LockKey, Trash } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { useNavigate } from 'react-router'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { notificationsApi, NotificationData } from '../features/notifications/services/notifications.api'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { useAuth } from '../features/auth/hooks/useAuth'
import { useNotificationSocket } from '../hooks/useNotificationSocket'
import { toast } from 'sonner'
import { useWebHaptics } from 'web-haptics/react'
import { useQueryClient } from '@tanstack/react-query'

function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 45%, 42%)`
}

function getInitials(name: string): string {
  if (!name) return "?"
  return name.substring(0, 2).toUpperCase()
}

const NotificationsPopover = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const haptic = useWebHaptics()
  const queryClient = useQueryClient()
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const shownNotificationsRef = useRef<Set<string>>(new Set())

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationsApi.getNotifications()
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.is_read).length)
      // Seed shownNotificationsRef with existing notification IDs
      data.forEach(n => shownNotificationsRef.current.add(n.id))
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Listen for real-time notifications via WebSocket
  useNotificationSocket({
    userId: user?.id,
    onNotificationReceived: useCallback((notification: NotificationData) => {
      if (shownNotificationsRef.current.has(notification.id)) return
      shownNotificationsRef.current.add(notification.id)

      if (!notification.is_read) {
        setUnreadCount(prevCount => prevCount + 1)
      }

      // Invalidate relevant queries globally on receiving notifications
      queryClient.invalidateQueries({ queryKey: ["events"] })
      if (notification.link) {
        const match = notification.link.match(/\/events\/([^\/?#]+)/)
        if (match && match[1]) {
          const eventId = match[1]
          queryClient.invalidateQueries({ queryKey: ["event", eventId] })
          queryClient.invalidateQueries({ queryKey: ["attendees", eventId] })
          queryClient.invalidateQueries({ queryKey: ["join-requests-count", eventId] })
          queryClient.invalidateQueries({ queryKey: ["join-requests", eventId] })
        }
      }

      toast.info(notification.title, {
        description: notification.message,
        action: notification.link ? {
          label: 'View',
          onClick: () => navigate(notification.link!)
        } : undefined
      })

      setNotifications(prev => {
        const isDuplicate = prev.some(n => n.id === notification.id)
        if (isDuplicate) return prev
        return [notification, ...prev].slice(0, 20)
      })
    }, [navigate, queryClient])
  })

  const handleNotificationClick = async (n: NotificationData) => {
    haptic.trigger("light")
    setPopoverOpen(false)
    if (!n.is_read) {
      try {
        await notificationsApi.markAsRead(n.id)
        fetchNotifications()
      } catch (error) {
        console.error('Failed to mark as read:', error)
      }
    }

    if (n.link) {
      navigate(n.link)
    }
  }

  const handleClearAll = async () => {
    try {
      await notificationsApi.clearNotifications()
      haptic.trigger("success")
      setNotifications([])
      setUnreadCount(0)
      shownNotificationsRef.current.clear()
    } catch (error) {
      haptic.trigger("error")
      console.error('Failed to clear notifications:', error)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'EVENT_JOIN':
        return <UserPlus size={20} className="text-blue-500" />
      case 'JOIN_REQUEST':
        return <LockKey size={20} className="text-amber-500" />
      case 'JOIN_APPROVED':
        return <Check size={20} className="text-green-500" />
      case 'JOIN_REJECTED':
      case 'EVENT_REMOVE':
        return <X size={20} className="text-red-500" />
      case 'EVENT_UPDATE':
        return <Calendar size={20} className="text-amber-500" />
      default:
        return <Info size={20} className="text-neutral-500" />
    }
  }

  return (
    <Popover open={popoverOpen} onOpenChange={(open) => {
      setPopoverOpen(open)
      if (open) {
        fetchNotifications()
      }
    }}>
      <PopoverTrigger asChild>
        <button 
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
          className="relative p-2.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 group cursor-pointer"
        >
          <Bell size={22} weight={unreadCount > 0 ? "fill" : "regular"} className={cn(unreadCount > 0 && "text-neutral-900 dark:text-white")} />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-neutral-950 rounded-full"
              />
            )}
          </AnimatePresence>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-96 p-0 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-xl border-neutral-100 dark:border-neutral-800 rounded-3xl shadow-2xl overflow-hidden" align="end" sideOffset={8}>
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-white dark:bg-neutral-950">
          <h3 className="font-bold text-3xl font-sirage">Notifications</h3>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-full uppercase tracking-widest">
              {unreadCount} New
            </span>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto overflow-x-hidden py-2 custom-scrollbar">
          {notifications.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center gap-3">
              <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-full">
                <Bell size={32} className="text-neutral-300" />
              </div>
              <p className="text-sm text-neutral-500 font-medium">All caught up!</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                onClick={() => handleNotificationClick(n)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleNotificationClick(n);
                  }
                }}
                className={cn(
                  "w-full px-4 py-4 flex gap-4 transition-all duration-300 relative group text-left border-b border-neutral-50 dark:border-neutral-900/50 last:border-none cursor-pointer outline-none focus-visible:bg-neutral-100 dark:focus-visible:bg-neutral-900/50",
                  !n.is_read ? "bg-blue-50/30 dark:bg-blue-500/5" : "hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                )}
              >
                <div className={cn(
                  "shrink-0 w-12 h-12 rounded-full flex items-center justify-center shadow-sm border overflow-hidden",
                  !n.is_read ? "bg-white dark:bg-neutral-800 border-2 border-black dark:border-white" : "bg-neutral-50 dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800"
                )}>
                  {n.image_url ? (
                    <img 
                      src={n.image_url} 
                      alt="" 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    />
                  ) : n.type === 'EVENT_JOIN' || n.type === 'JOIN_REQUEST' || n.type === 'JOIN_APPROVED' ? (
                    (() => {
                      const nameMatch = n.message.match(/^(.*?) has joined/i) || n.message.match(/^(.*?) has requested/i);
                      const name = nameMatch ? nameMatch[1] : '?';
                      return (
                        <div 
                          className="w-full h-full flex items-center justify-center text-white text-sm font-semibold select-none"
                          style={{ backgroundColor: avatarColor(name) }}
                        >
                          {getInitials(name)}
                        </div>
                      )
                    })()
                  ) : (
                    getIcon(n.type)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <p className={cn(
                      "text-sm font-bold truncate",
                      !n.is_read ? "text-neutral-900 dark:text-white" : "text-neutral-600 dark:text-neutral-400"
                    )}>
                      {n.title}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <p className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-tighter mt-0.5">
                        {(() => {
                          const date = new Date(n.created_at);
                          return !isNaN(date.getTime()) 
                            ? formatDistanceToNow(date, { addSuffix: true }) 
                            : 'just now';
                        })()}
                      </p>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          haptic.trigger("light");
                          try {
                            await notificationsApi.deleteNotification(n.id);
                            toast.success("Notification deleted");
                            fetchNotifications();
                          } catch (error) {
                            toast.error("Failed to delete notification");
                          }
                        }}
                        className="md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 focus:opacity-100 p-1 text-neutral-400 hover:text-red-500 dark:hover:text-red-400 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all cursor-pointer"
                        title="Delete notification"
                      >
                        <Trash size={12} weight="bold" />
                      </button>
                    </div>
                  </div>
                  <p className={cn(
                    "text-xs leading-relaxed line-clamp-2",
                    !n.is_read ? "text-neutral-700 dark:text-neutral-300 font-medium" : "text-neutral-500"
                  )}>
                    {n.message}
                  </p>
                </div>
                {!n.is_read && (
                  <div className="absolute right-4 bottom-4 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <div className="p-1 bg-blue-500 rounded-full text-white">
                      <Check size={10} weight="bold" />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        {notifications.length > 0 && (
          <div className="p-3 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
            <Button 
              variant="ghost" 
              onClick={handleClearAll}
              className="w-full text-[11px] font-bold uppercase tracking-widest h-8 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Clear All Notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

export default NotificationsPopover
