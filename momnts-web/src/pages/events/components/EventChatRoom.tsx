import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, Suspense } from "react"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { useChatMessages, useSendChatMessage } from "@/features/chats/hooks/useChats"
import { cn } from "@/lib/utils"
import { chatsApi } from "@/features/chats/services/chats.api"

import { useEventAttendees } from "@/features/events/hooks/useEvents"
import { encryptTextMessage } from "@/lib/crypto/e2ee"
import { useQueryClient } from "@tanstack/react-query"
import { useWebHaptics } from "web-haptics/react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Lock,
  PaperPlaneRight,
  Image as ImageIcon,
  X,
  ArrowDown,
  Users
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { ChatMessageData } from "@/features/chats/services/chats.api"

// Modular Imports
import { getCachedProfilePhoto } from "./chatUtils"
import { ChatMessageItem } from "./ChatMessageItem"
import { TaggedPhotoThumbnail } from "./TaggedPhotoThumbnail"
import { PhotoPickerModal } from "./PhotoPickerModal"
import { ReplyingMessagePreview } from "./ReplyingMessagePreview"

interface EventChatRoomProps {
  eventId: string
  dek: CryptoKey | null
  photos: any[]
  onPhotoClick: (photoId: string, messagePhotos?: any[]) => void
  isOrganizer?: boolean
  onClose?: () => void
  socketRef?: React.MutableRefObject<any>
  selectedPhotos: any[]
  setSelectedPhotos: React.Dispatch<React.SetStateAction<any[]>>
}

export default function EventChatRoom({
  eventId,
  dek,
  photos,
  onPhotoClick,
  isOrganizer = false,
  onClose,
  socketRef,
  selectedPhotos,
  setSelectedPhotos
}: EventChatRoomProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const haptic = useWebHaptics()
  const scrollRef = useRef<HTMLDivElement>(null)
  const tempIdMapRef = useRef<Map<string, string>>(new Map())

  const [inputText, setInputText] = useState("")
  const [viewportStyle, setViewportStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return

    const handleResize = () => {
      const isMobile = window.innerWidth < 640
      if (isMobile) {
        const vv = window.visualViewport
        if (!vv) return
        setViewportStyle({
          height: `${vv.height}px`,
          transform: `translate3d(0, ${vv.offsetTop}px, 0)`,
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
        })
      } else {
        setViewportStyle({})
      }
    }

    const vv = window.visualViewport
    vv.addEventListener("resize", handleResize)
    vv.addEventListener("scroll", handleResize)
    window.addEventListener("resize", handleResize)

    handleResize()

    return () => {
      vv.removeEventListener("resize", handleResize)
      vv.removeEventListener("scroll", handleResize)
      window.removeEventListener("resize", handleResize)
    }
  }, [])
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false)
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessageData | null>(null)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [explicitMentions, setExplicitMentions] = useState<{ name: string; id: string }[]>([])
  const [onlineCount, setOnlineCount] = useState(1)

  const [isFirstTimeChat, setIsFirstTimeChat] = useState(() => {
    return localStorage.getItem("momnts_chat_first_time") === null
  })

  const handleDismissTooltip = React.useCallback(() => {
    localStorage.setItem("momnts_chat_first_time", "false")
    setIsFirstTimeChat(false)
  }, [])

  // Real-time typing indicators state
  interface TypingUser {
    id: string
    name: string
    selfie_url: string | null
    timestamp: number
  }
  const [typingUsers, setTypingUsers] = useState<Record<string, TypingUser>>({})
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isTypingRef = useRef(false)
  const isAutoScrollingRef = useRef(false)
  const autoScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const sendTypingStatus = (isTyping: boolean) => {
    if (!socketRef?.current || !eventId || !user) return
    socketRef.current.emit("chat:typing", {
      eventId,
      isTyping,
      user: {
        name: user.username || "Guest",
        selfie_url: user.selfie_url || null
      }
    })
  }

  // Socket listener for typing events
  useEffect(() => {
    const socket = socketRef?.current
    if (!socket) return

    const handleTyping = (data: {
      userId: string
      user: { id: string; name: string; selfie_url: string | null }
      isTyping: boolean
      timestamp: number
    }) => {
      if (data.userId === user?.id) return
      setTypingUsers((prev) => {
        const next = { ...prev }
        if (data.isTyping) {
          next[data.userId] = {
            id: data.user.id,
            name: data.user.name,
            selfie_url: data.user.selfie_url,
            timestamp: data.timestamp
          }
        } else {
          delete next[data.userId]
        }
        return next
      })
    }

    socket.on("chat:typing", handleTyping)
    return () => {
      socket.off("chat:typing", handleTyping)
    }
  }, [socketRef, user?.id])

  // Periodic cleanup of stale typing users (e.g. offline/tab closed)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setTypingUsers((prev) => {
        let changed = false
        const next = { ...prev }
        for (const userId in next) {
          if (now - next[userId].timestamp > 6000) {
            delete next[userId]
            changed = true
          }
        }
        return changed ? next : prev
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  // Clean up own typing indicator when component unmounts
  useEffect(() => {
    return () => {
      if (isTypingRef.current) {
        sendTypingStatus(false)
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current)
      }
    }
  }, [])

  // Get up to 3 most recent typing users sorted by timestamp descending
  const recentTypingUsers = useMemo(() => {
    return Object.values(typingUsers)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 3)
  }, [typingUsers])

  // Listen for online presence count updates
  useEffect(() => {
    const socket = socketRef?.current
    if (!socket) return

    const handlePresence = (data: { eventId: string; onlineCount: number }) => {
      if (data.eventId === eventId) {
        setOnlineCount(data.onlineCount)
      }
    }

    socket.on("chat:presence", handlePresence)

    // Request current presence count immediately on mount
    socket.emit("chat:get-presence", { eventId })

    return () => {
      socket.off("chat:presence", handlePresence)
    }
  }, [socketRef, eventId])



  const handleLoadOlder = async () => {
    if (!chatsData?.nextCursor || loadingOlder) return
    setLoadingOlder(true)
    try {
      const older = await chatsApi.getChatMessages(eventId, chatsData.nextCursor)
      queryClient.setQueryData(["chats", eventId], (oldData: any) => {
        if (!oldData) return older;
        return {
          ...oldData,
          total: oldData.total + older.data.length,
          data: [...older.data, ...oldData.data], // older messages come first
          nextCursor: older.nextCursor
        }
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingOlder(false)
    }
  }

  const handleStartReply = React.useCallback((msg: ChatMessageData) => {
    haptic.trigger("light")
    setReplyingToMessage(msg)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [haptic])

  const { data: chatsData, isLoading } = useChatMessages(eventId)
  const sendMutation = useSendChatMessage(eventId)
  const { data: attendees = [] } = useEventAttendees(eventId)

  const messages = chatsData?.data || []

  const topEmojis = useMemo(() => {
    const counts: Record<string, number> = {}
    messages.forEach((msg) => {
      msg.reactions?.forEach((r) => {
        counts[r.emoji] = (counts[r.emoji] || 0) + 1
      })
    })
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([emoji]) => emoji)

    const defaults = ["👍", "❤️", "😂", "😮", "😢"]
    const result = [...sorted]
    for (const emoji of defaults) {
      if (result.length >= 5) break
      if (!result.includes(emoji)) {
        result.push(emoji)
      }
    }
    return result.slice(0, 5)
  }, [messages])

  // Emit read events for loaded/received messages
  useEffect(() => {
    if (messages.length > 0 && socketRef?.current && eventId && user) {
      const lastMsg = messages[messages.length - 1];
      const myAccess = attendees.find((a: any) => a.user_id === user.id);
      const currentReadId = myAccess?.last_read_message_id;

      if (lastMsg.id !== currentReadId && !lastMsg.id.startsWith("temp-")) {
        socketRef.current.emit("chat:read", {
          eventId,
          messageId: lastMsg.id,
        });
      }
    }
  }, [messages, socketRef, eventId, user, attendees]);

  // Mentions logic
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0)
  const [mentionState, setMentionState] = useState<{ query: string; startIdx: number; endIdx: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const suggestions = useMemo(() => {
    if (!mentionState || !eventId) return []
    const q = mentionState.query.toLowerCase()
    const list: any[] = []

    // Add virtual "everyone" suggestion if matching query
    if ("everyone".startsWith(q)) {
      list.push({
        id: "everyone",
        isEveryone: true,
        user: {
          name: "everyone",
          selfie_url: null,
        }
      })
    }

    const filtered = attendees.filter((a: any) => {
      const name = a.user?.name || ""
      return name.toLowerCase().includes(q)
    })

    list.push(...filtered)
    return list
  }, [mentionState, attendees, eventId])

  const getMentionQuery = (val: string, cursorIndex: number) => {
    const textBeforeCursor = val.slice(0, cursorIndex)
    const lastAtIdx = textBeforeCursor.lastIndexOf("@")
    if (lastAtIdx === -1) return null

    const isAtWordStart = lastAtIdx === 0 || /\s/.test(textBeforeCursor[lastAtIdx - 1])
    if (!isAtWordStart) return null

    const segment = textBeforeCursor.slice(lastAtIdx)
    const query = segment.slice(1)
    if (query.startsWith(" ") || query.length > 30) return null

    return {
      query,
      startIdx: lastAtIdx,
      endIdx: cursorIndex,
    }
  }

  const handleTextChangeOrCursorMove = (val: string, cursorIndex: number, preserveIndex = false) => {
    const state = getMentionQuery(val, cursorIndex)
    setMentionState(state)
    if (state && !preserveIndex) {
      setActiveSuggestionIndex(0)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputText(val)
    setExplicitMentions(prev => {
      const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return prev.filter(m => {
        const regex = new RegExp(`@${escapeRegExp(m.name)}`, 'i')
        return regex.test(val)
      })
    })
    handleTextChangeOrCursorMove(val, e.target.selectionStart || val.length)

    // Trigger typing state
    if (val.trim().length > 0) {
      if (!isTypingRef.current) {
        isTypingRef.current = true
        sendTypingStatus(true)
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false
        sendTypingStatus(false)
      }, 3000)
    } else {
      if (isTypingRef.current) {
        isTypingRef.current = false
        sendTypingStatus(false)
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
        }
      }
    }
  }

  const handleInputKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) {
      const preserveIndex = ["ArrowUp", "ArrowDown"].includes(e.key)
      handleTextChangeOrCursorMove(inputText, e.currentTarget.selectionStart || inputText.length, preserveIndex)
    }
  }

  const handleInputMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    handleTextChangeOrCursorMove(inputText, e.currentTarget.selectionStart || inputText.length)
  }

  const selectAttendee = (attendee: any) => {
    if (!mentionState) return
    const name = attendee.isEveryone ? "everyone" : (attendee.user?.name || "")
    const id = attendee.isEveryone ? "everyone" : (attendee.user?.id || attendee.id)
    const before = inputText.slice(0, mentionState.startIdx)
    const after = inputText.slice(mentionState.endIdx)
    const newText = `${before}@${name} ${after}`
    setInputText(newText)
    setExplicitMentions(prev => [...prev, { name, id }])
    setMentionState(null)

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        const newCursorPos = mentionState.startIdx + name.length + 2
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (mentionState && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveSuggestionIndex((prev) => (prev + 1) % suggestions.length)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveSuggestionIndex(
          (prev) => (prev - 1 + suggestions.length) % suggestions.length
        )
        return
      }
      if (e.key === "Enter") {
        e.preventDefault()
        selectAttendee(suggestions[activeSuggestionIndex])
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        setMentionState(null)
        return
      }
    }
  }



  // Scroll to bottom helper
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (scrollRef.current) {
      if (behavior === "smooth") {
        isAutoScrollingRef.current = true
        if (autoScrollTimeoutRef.current) {
          clearTimeout(autoScrollTimeoutRef.current)
        }
        autoScrollTimeoutRef.current = setTimeout(() => {
          isAutoScrollingRef.current = false
        }, 500)
      }
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior
      })
    }
  }

  const initialLastReadIdRef = useRef<string | null>(null)

  useEffect(() => {
    initialLastReadIdRef.current = localStorage.getItem(`lastReadMsg_${eventId}`)
  }, [eventId])

  const chatOpenedAtRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isLoading) {
      if (chatOpenedAtRef.current === null) {
        if (messages.length > 0) {
          const timestamps = messages.map(m => new Date(m.created_at).getTime())
          chatOpenedAtRef.current = Math.max(Math.max(...timestamps), Date.now())
        } else {
          chatOpenedAtRef.current = Date.now()
        }
      }
    }
  }, [isLoading, messages])

  // Auto-scroll on loading finished or new messages
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      setTimeout(() => {
        let scrolled = false;
        if (initialLastReadIdRef.current) {
          const el = document.getElementById(`msg-${initialLastReadIdRef.current}`);
          if (el) {
            el.scrollIntoView({ behavior: 'auto', block: 'center' });
            scrolled = true;
          }
        }
        if (!scrolled) {
          scrollToBottom("auto");
        }

        const lastMsg = messages[messages.length - 1];
        localStorage.setItem(`lastReadMsg_${eventId}`, lastMsg.id);
      }, 100)
    }
  }, [isLoading])

  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1]
      if (!isLoading) {
        localStorage.setItem(`lastReadMsg_${eventId}`, lastMsg.id)
      }
      const isMyMessage = lastMsg?.user_id === user?.id
      if (isMyMessage || !showScrollBottom) {
        setTimeout(() => scrollToBottom("smooth"), 50)
      }
    }
  }, [messages.length])

  // Track scroll position to show/hide the scroll-to-bottom floating button
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    const diff = target.scrollHeight - target.scrollTop - target.clientHeight
    // Show button if user scrolled up more than 100px
    const shouldShow = diff > 100
    if (shouldShow && isAutoScrollingRef.current) {
      return
    }
    setShowScrollBottom(shouldShow)
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = inputText.trim()
    if ((!text && selectedPhotos.length === 0) || !dek || sendMutation.isPending) return

    // Immediately stop typing indicator on send
    if (isTypingRef.current) {
      isTypingRef.current = false
      sendTypingStatus(false)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }

    // Keep input focused synchronously to avoid keyboard flicker
    if (inputRef.current) {
      inputRef.current.focus()
    }

    try {
      // Extract mentioned user IDs before encryption
      const mentionedUserIds: string[] = []
      let textToSearch = text
      const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      // 1. First extract explicit mentions selected via suggestions dropdown
      const sortedExplicit = [...explicitMentions].sort((a, b) => b.name.length - a.name.length)
      for (const explicit of sortedExplicit) {
        const namePattern = escapeRegExp(explicit.name)
        const regex = new RegExp(`(?:^|\\s)@(${namePattern})(?:$|\\s|[.,!?;:])`, 'i')
        if (regex.test(textToSearch)) {
          mentionedUserIds.push(explicit.id)
          textToSearch = textToSearch.replace(new RegExp(`@${namePattern}`, 'gi'), '')
        }
      }

      // 2. Parse any remaining typed mentions that weren't explicitly captured from the dropdown
      const everyoneRegex = /(?:^|\s)@everyone(?:$|\s|[.,!?;:])/i
      if (everyoneRegex.test(textToSearch)) {
        mentionedUserIds.push("everyone")
        textToSearch = textToSearch.replace(/@everyone/gi, '')
      }

      const sortedAttendees = [...attendees].sort((a, b) => (b.user?.name?.length || 0) - (a.user?.name?.length || 0))

      for (const attendee of sortedAttendees) {
        if (!attendee.user?.name || attendee.user.id === user?.id) continue

        // Skip if already matched
        if (mentionedUserIds.includes(attendee.user.id)) continue

        const namePattern = escapeRegExp(attendee.user.name)
        const regex = new RegExp(`(?:^|\\s)@(${namePattern})(?:$|\\s|[.,!?;:])`, 'i')

        if (regex.test(textToSearch)) {
          mentionedUserIds.push(attendee.user.id)
          textToSearch = textToSearch.replace(new RegExp(`@${namePattern}`, 'gi'), '')
        }
      }

      // Encrypt the message text client-side
      const encrypted = await encryptTextMessage(text || `Tagged ${selectedPhotos.length} photo${selectedPhotos.length === 1 ? "" : "s"}`, dek)

      // Use mutate instead of await mutateAsync to prevent layout/keyboard focus loss from waiting on network response
      sendMutation.mutate({
        message_text: encrypted.ciphertext,
        encryption_iv: encrypted.iv,
        encryption_tag: encrypted.tag,
        photo_ids: selectedPhotos.map(p => p.id),
        mentions: mentionedUserIds,
        parent_id: replyingToMessage?.id || undefined,
        optimisticUser: user ? {
          id: user.id,
          name: user.username,
          selfie_url: user.selfie_url
        } : undefined
      })

      haptic.trigger("success")
      setInputText("")
      setExplicitMentions([])
      setSelectedPhotos([])
      setReplyingToMessage(null)

      setTimeout(() => scrollToBottom("smooth"), 100)
    } catch (err) {
      haptic.trigger("error")
      toast.error("Failed to encrypt and send message.")
      console.error(err)
    }
  }

  return (
    <div
      className="flex flex-col h-full w-full bg-background relative overflow-hidden"
      style={viewportStyle}
    >

      {/* E2EE Header Banner */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-card/40 backdrop-blur-xl shrink-0 z-10">
        <div>
          <h3 className="font-semibold text-[14px] leading-tight text-foreground">Event Chat</h3>
          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground font-medium select-none">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
              {onlineCount} {onlineCount === 1 ? 'online' : 'online'}
            </span>
            <span className="text-muted-foreground/30">•</span>
            <span className="flex items-center gap-1 text-muted-foreground/80">
              <Lock size={10} className="shrink-0" />
              End-to-End Encrypted
            </span>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={() => { haptic.trigger("light"); onClose(); }} className="rounded-full h-8 w-8 hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer">
            <X size={16} weight="bold" />
          </Button>
        )}
      </div>

      {/* Message History Feed */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3.5 py-5 sm:px-5 min-h-0"
      >
        <div className="flex flex-col gap-6">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
              <div className="h-6 w-6 border-2 border-t-transparent border-primary rounded-full animate-spin" />
              <span>Loading encrypted message history...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground mt-20">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Lock size={28} className="text-muted-foreground/50" />
              </div>
              <p className="text-sm font-semibold text-foreground/80">No messages yet</p>
              <p className="text-xs max-w-[240px] mt-2 leading-relaxed">
                Be the first to say hello! Your chat messages are securely encrypted on your device.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {chatsData?.nextCursor && (
                <div className="flex justify-center py-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadOlder}
                    disabled={loadingOlder}
                    className="rounded-full text-xs"
                  >
                    {loadingOlder ? "Loading..." : "Load Older Messages"}
                  </Button>
                </div>
              )}
              <AnimatePresence initial={false}>
                {messages.map((msg, index) => {
                  // Generate a stable key for each message that is preserved across optimistic updates and edits
                  let messageKey = msg.id
                  if (msg.id.startsWith("temp-")) {
                    if (msg.encryption_iv) {
                      tempIdMapRef.current.set(msg.encryption_iv, msg.id)
                    }
                  } else {
                    if (msg.encryption_iv && tempIdMapRef.current.has(msg.encryption_iv)) {
                      const tempId = tempIdMapRef.current.get(msg.encryption_iv)!
                      tempIdMapRef.current.set(msg.id, tempId)
                      messageKey = tempId
                    } else if (tempIdMapRef.current.has(msg.id)) {
                      messageKey = tempIdMapRef.current.get(msg.id)!
                    }
                  }

                  const prevMsg = index > 0 ? messages[index - 1] : null
                  const showDateTag = !prevMsg ||
                    new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()

                  return (
                    <React.Fragment key={messageKey}>
                      {showDateTag && (
                        <div className="flex justify-center my-3 select-none">
                          <span className="bg-neutral-100/90 dark:bg-neutral-800/60 border border-neutral-200/50 dark:border-white/5 text-neutral-600 dark:text-neutral-300 text-[11px] font-bold px-3.5 py-1 rounded-full shadow-sm backdrop-blur-md">
                            {formatChatDate(msg.created_at)}
                          </span>
                        </div>
                      )}
                      <ChatMessageItem
                        msg={msg}
                        dek={dek}
                        isSelf={msg.user_id === user?.id}
                        allPhotos={photos}
                        onPhotoClick={onPhotoClick}
                        isOrganizer={isOrganizer}
                        onReply={handleStartReply}
                        attendees={attendees}
                        messages={messages}
                        index={index}
                        showActionsTooltip={isFirstTimeChat && index === messages.length - 1}
                        onDismissTooltip={handleDismissTooltip}
                        topEmojis={topEmojis}
                        chatOpenedAt={chatOpenedAtRef.current}
                      />
                    </React.Fragment>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom Navigation Arrow */}
      <AnimatePresence>
        {showScrollBottom && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, x: "-50%", y: 10 }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: "-50%", y: 10 }}
            onClick={() => scrollToBottom("smooth")}
            className="absolute bottom-[90px] left-1/2 bg-primary text-primary-foreground h-10 w-10 rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-all cursor-pointer z-50"
          >
            <ArrowDown size={20} weight="bold" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Send Message Panel */}
      <form onSubmit={handleSend} className="p-4 bg-card/60 backdrop-blur-xl border-t border-border flex flex-col gap-3 relative shrink-0 z-10">

        {/* Selected Tagged Photos Attachment Overlay */}
        <AnimatePresence>
          {selectedPhotos.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 10, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2.5 p-2 rounded-xl bg-white/5 border border-white/10 mb-1 max-w-full items-center">
                {selectedPhotos.map((photo) => (
                  <div key={photo.id} className="relative group shrink-0">
                    <TaggedPhotoThumbnail photo={photo} dek={dek} />
                    <button
                      type="button"
                      onClick={() => {
                        haptic.trigger("light");
                        setSelectedPhotos(prev => prev.filter(p => p.id !== photo.id));
                      }}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 shadow-md cursor-pointer transition-colors"
                      title="Remove attachment"
                    >
                      <X size={10} weight="bold" />
                    </button>
                  </div>
                ))}
                <div className="flex flex-col justify-center min-w-[80px] pl-1">
                  <span className="text-[11px] font-bold text-foreground">
                    {selectedPhotos.length} Photo{selectedPhotos.length === 1 ? "" : "s"} Tagged
                  </span>
                  <span className="text-[9px] text-muted-foreground">Will be attached</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* WhatsApp/Telegram-style Replying to Message Preview Banner */}
        <AnimatePresence>
          {replyingToMessage && (() => {
            const hasPhoto = replyingToMessage.photos && replyingToMessage.photos.length > 0;
            return (
              <motion.div
                initial={{ opacity: 0, y: 10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: 10, height: 0 }}
                className="overflow-hidden"
              >
                {hasPhoto ? (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10 mb-1">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-800 shrink-0">
                        <TaggedPhotoThumbnail photo={replyingToMessage.photos[0]} dek={dek} isFullFill={true} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-[#6B8AFD]">
                          Reply to {replyingToMessage.user?.name || "Guest"}
                        </div>
                        <div className="mt-0.5">
                          <ReplyingMessagePreview msg={replyingToMessage} dek={dek} hasPhotoLayout={true} />
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => { haptic.trigger("light"); setReplyingToMessage(null); }}
                      className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 cursor-pointer shrink-0 ml-2"
                    >
                      <X size={14} weight="bold" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border-l-4 border-l-primary border border-white/10 mb-1">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="text-[11px] font-bold text-primary flex items-center gap-1">
                        <span>Replying to {replyingToMessage.user?.name || "Guest"}</span>
                      </div>
                      <ReplyingMessagePreview msg={replyingToMessage} dek={dek} />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => { haptic.trigger("light"); setReplyingToMessage(null); }}
                      className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 cursor-pointer shrink-0"
                    >
                      <X size={14} weight="bold" />
                    </Button>
                  </div>
                )}
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* Mentions dropdown list */}
        {mentionState && suggestions.length > 0 && (
          <div className="absolute bottom-full left-0 mb-2 w-full max-h-48 overflow-y-auto bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-xl z-50 p-1 flex flex-col gap-0.5 custom-scrollbar">
            {suggestions.map((item: any, index: number) => {
              const isSelected = index === activeSuggestionIndex
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectAttendee(item)}
                  onMouseEnter={() => setActiveSuggestionIndex(index)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm cursor-pointer transition-colors w-full ${isSelected
                    ? "bg-primary/20 text-foreground border border-primary/30"
                    : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6 shrink-0 border border-white/10 rounded-full overflow-hidden">
                      {item.isEveryone ? (
                        <div className="bg-primary/20 text-primary w-full h-full flex items-center justify-center rounded-full">
                          <Users size={12} weight="bold" />
                        </div>
                      ) : (
                        <>
                          {item.user?.selfie_url && <AvatarImage src={getCachedProfilePhoto(item.user.id || item.id, item.user.selfie_url)} className="object-cover" />}
                          <AvatarFallback className="bg-muted text-[10px] font-bold text-foreground">
                            {item.user?.name ? item.user.name.substring(0, 2).toUpperCase() : "?"}
                          </AvatarFallback>
                        </>
                      )}
                    </Avatar>
                    <span className="font-medium capitalize">{item.user?.name}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Typing Indicator */}
        <AnimatePresence>
          {recentTypingUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 5, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 5, height: 0 }}
              className="flex items-center gap-2.5 px-1 py-1 overflow-hidden"
            >
              {/* Avatar Stack */}
              <div className="flex -space-x-2 shrink-0">
                {recentTypingUsers.map((u, i) => (
                  <Avatar
                    key={u.id}
                    className="w-5 h-5 border border-background shadow-sm rounded-full overflow-hidden select-none"
                    style={{ zIndex: recentTypingUsers.length - i }}
                  >
                    {u.selfie_url && <AvatarImage src={getCachedProfilePhoto(u.id, u.selfie_url)} alt={u.name} className="object-cover" />}
                    <AvatarFallback className="bg-muted text-[8px] font-bold text-foreground">
                      {u.name ? u.name.substring(0, 2).toUpperCase() : "?"}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>

              {/* Text & Bouncing Dots */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium">typing</span>
                <div className="flex gap-1 items-center h-3">
                  <span className="w-1 h-1 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Textbox & Buttons */}
        <div className="flex items-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => { haptic.trigger("light"); setPhotoPickerOpen(true); }}
            className="rounded-full border-border bg-card hover:bg-white/10 shrink-0 cursor-pointer h-[42px] w-[42px] transition-colors relative"
            title="Tag a photo"
          >
            <ImageIcon size={20} />
            {selectedPhotos.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center border border-background">
                {selectedPhotos.length}
              </span>
            )}
          </Button>

          <Input
            id="chat-input-field"
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            onKeyUp={handleInputKeyUp}
            onMouseUp={handleInputMouseUp}
            placeholder="Type your message..."
            className="flex-1 h-[42px] bg-white/5 border-white/10 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/50 rounded-full px-4 text-[14px] text-foreground transition-all"
            maxLength={1000}
          />

          <Button
            type="submit"
            disabled={(!inputText.trim() && selectedPhotos.length === 0) || sendMutation.isPending}
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={(e) => e.preventDefault()}
            className="rounded-full h-[42px] w-[42px] p-0 flex items-center justify-center shrink-0 cursor-pointer shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            <PaperPlaneRight size={18} weight="fill" />
          </Button>
        </div>
      </form>

      {/* Photo Picker Dialog Overlay */}
      {photoPickerOpen && (
        <PhotoPickerModal
          photos={photos}
          dek={dek}
          initialSelected={selectedPhotos}
          onSelect={(selectedList) => {
            haptic.trigger("selection")
            setSelectedPhotos(selectedList)
            setPhotoPickerOpen(false)
          }}
          onClose={() => setPhotoPickerOpen(false)}
        />
      )}
    </div>
  )
}

const formatChatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()

  if (isSameDay(date, today)) {
    return "Today"
  } else if (isSameDay(date, yesterday)) {
    return "Yesterday"
  } else {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }
    if (date.getFullYear() !== today.getFullYear()) {
      options.year = 'numeric'
    }
    return date.toLocaleDateString("en-US", options)
  }
}
