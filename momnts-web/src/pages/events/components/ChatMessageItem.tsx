import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from "react"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { useUpdateChatMessage, useDeleteChatMessage, useToggleChatMessageReaction } from "@/features/chats/hooks/useChats"
import { useTheme } from "next-themes"
import { useWebHaptics } from "web-haptics/react"
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import {
  Warning,
  Eye,
  Pencil,
  Trash,
  ArrowBendUpLeft,
  Check,
  Checks,
  Clock,
  Smiley,
  Plus
} from "@phosphor-icons/react"
import { toast } from "sonner"
import EmojiPicker from "emoji-picker-react"
import { ChatMessageData } from "@/features/chats/services/chats.api"
import { decryptTextMessage, encryptTextMessage } from "@/lib/crypto/e2ee"

// Modular Imports
import { getCachedProfilePhoto } from "./chatUtils"
import { TaggedPhotoThumbnail } from "./TaggedPhotoThumbnail"
import { ParentMessageQuote } from "./ParentMessageQuote"
import { ParentMessageText } from "./ParentMessageText"
import { MobileMessageActions } from "./MobileMessageActions"

// Keep track of messages that have already been animated on the current chat room mount
let lastChatOpenedAt: number | null = null
const animatedSignatures = new Set<string>()

export interface ChatMessageItemProps {
  msg: ChatMessageData
  dek: CryptoKey | null
  isSelf: boolean
  allPhotos: any[]
  onPhotoClick: (photoId: string, messagePhotos: any[]) => void
  isOrganizer: boolean
  onReply: (msg: ChatMessageData) => void
  attendees: any[]
  messages: ChatMessageData[]
  index: number
  showActionsTooltip?: boolean
  onDismissTooltip?: () => void
  topEmojis: string[]
  chatOpenedAt: number | null
}

function ChatMessageItemComponent({
  msg,
  dek,
  isSelf,
  allPhotos,
  onPhotoClick,
  isOrganizer,
  onReply,
  attendees,
  messages,
  index,
  showActionsTooltip,
  onDismissTooltip,
  topEmojis,
  chatOpenedAt
}: ChatMessageItemProps) {
  const { resolvedTheme } = useTheme()
  const [decryptedText, setDecryptedText] = useState("")
  const [decryptionError, setDecryptionError] = useState(false)
  const [decrypting, setDecrypting] = useState(true)

  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState("")
  const [isWithinEditWindow, setIsWithinEditWindow] = useState(true)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [clickCoords, setClickCoords] = useState<{ x: number; y: number } | null>(null)

  const handleSetDropdownOpen = (open: boolean) => {
    setDropdownOpen(open)
    if (!open) {
      setClickCoords(null)
    }
  }
  const [reactionDetailsOpen, setReactionDetailsOpen] = useState(false)
  const [activeReactionTab, setActiveReactionTab] = useState("All")
  const [showFullPicker, setShowFullPicker] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const isTransitioningToFullPickerRef = useRef(false)
  const [isLargeScreen, setIsLargeScreen] = useState(false)

  useEffect(() => {
    const checkScreen = () => {
      setIsLargeScreen(window.innerWidth >= 640)
    }
    checkScreen()
    window.addEventListener('resize', checkScreen)
    return () => window.removeEventListener('resize', checkScreen)
  }, [])

  useEffect(() => {
    if (!popoverOpen) {
      setShowFullPicker(false)
    }
  }, [popoverOpen])

  const updateMutation = useUpdateChatMessage(msg.event_id)
  const deleteMutation = useDeleteChatMessage(msg.event_id)
  const toggleReactionMutation = useToggleChatMessageReaction(msg.event_id)
  const { user } = useAuth()
  const currentUserId = user?.id

  const reactionsByEmoji = useMemo(() => {
    if (!msg.reactions) return {};
    return msg.reactions.reduce((acc, r) => {
      acc[r.emoji] = acc[r.emoji] || { count: 0, hasReacted: false };
      acc[r.emoji].count++;
      if (r.user_id === currentUserId) acc[r.emoji].hasReacted = true;
      return acc;
    }, {} as Record<string, { count: number; hasReacted: boolean }>);
  }, [msg.reactions, currentUserId]);

  const totalReactionsCount = msg.reactions ? msg.reactions.length : 0;
  const hasAnyReactionFromSelf = useMemo(() => {
    if (!msg.reactions) return false;
    return msg.reactions.some((r) => r.user_id === currentUserId);
  }, [msg.reactions, currentUserId]);

  const uniqueEmojis = useMemo(() => {
    if (!msg.reactions) return [];
    const counts: Record<string, number> = {};
    for (const r of msg.reactions) {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    }
    return Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a])
      .slice(0, 4);
  }, [msg.reactions]);

  const hasUserReactedWith = (emoji: string) => {
    if (!msg.reactions || !currentUserId) return false;
    return msg.reactions.some((r) => r.user_id === currentUserId && r.emoji === emoji);
  };

  const messageQuickEmojis = useMemo(() => {
    const defaults = ["😑", "❤️", "👍", "👎", "🔥", "🥰", "👏"]
    let list = [...defaults]
    const myReactedEmojis = msg.reactions
      ? Array.from(new Set(msg.reactions.filter((r) => r.user_id === currentUserId).map((r) => r.emoji)))
      : [];

    if (myReactedEmojis.length > 0) {
      for (let i = myReactedEmojis.length - 1; i >= 0; i--) {
        const reactedEmoji = myReactedEmojis[i];
        list = list.filter((e) => e !== reactedEmoji);
        list.unshift(reactedEmoji);
      }
    }
    return list.slice(0, 7);
  }, [msg.reactions, currentUserId]);

  // Determine sending status / seen status
  const statusIcon = useMemo(() => {
    // Only show ticks/clock for self (sender) messages
    if (!isSelf) return null

    if (msg.id.startsWith("temp-") || msg.status === "sending") {
      return <Clock size={11} className="text-black dark:text-white animate-pulse" />
    }

    // Check if seen by all other attendees
    const otherAttendees = attendees.filter((a) => a.user_id !== msg.user_id)

    if (otherAttendees.length === 0) {
      // If there's no one else in the event, show single tick
      return <Check size={12} className="text-black dark:text-white" />
    }

    const seenByAll = otherAttendees.every((attendee) => {
      const attendeeLastReadId = attendee.last_read_message_id
      if (!attendeeLastReadId) return false

      // Find index of attendee's last read message
      const readIdx = messages.findIndex((m) => m.id === attendeeLastReadId)
      if (readIdx === -1) return false

      return readIdx >= index
    })

    if (seenByAll) {
      return <Checks size={14} className="text-black dark:text-white font-bold" />
    }

    return <Check size={12} className="text-black dark:text-white" />
  }, [msg.id, msg.status, msg.user_id, isSelf, attendees, messages, index])

  // Track the 15-minute edit window dynamically
  useEffect(() => {
    const checkWindow = () => {
      const elapsed = Date.now() - new Date(msg.created_at).getTime()
      const limit = 15 * 60 * 1000
      const isWithin = elapsed < limit
      setIsWithinEditWindow(isWithin)
      return limit - elapsed
    }

    const remaining = checkWindow()
    if (remaining > 0) {
      const timer = setTimeout(() => {
        setIsWithinEditWindow(false)
        setIsEditing(false)
      }, remaining)
      return () => clearTimeout(timer)
    } else {
      setIsWithinEditWindow(false)
    }
  }, [msg.created_at])
  const haptic = useWebHaptics()

  const dragX = useMotionValue(0)
  const replyIconOpacity = useTransform(dragX, isSelf ? [0, -60] : [0, 60], [0, 1])
  const replyIconScale = useTransform(dragX, isSelf ? [0, -60] : [0, 60], [0.6, 1.1])
  const replyIconX = useTransform(dragX, isSelf ? [0, -60] : [0, 60], isSelf ? [15, 0] : [-15, 0])
  const hasTriggeredHaptic = useRef(false)

  const handleDrag = (event: any, info: any) => {
    const thresholdCrossed = isSelf ? info.offset.x < -50 : info.offset.x > 50
    if (thresholdCrossed) {
      if (!hasTriggeredHaptic.current) {
        haptic.trigger("light")
        hasTriggeredHaptic.current = true
      }
    } else {
      hasTriggeredHaptic.current = false
    }
  }

  const handleDragEnd = (event: any, info: any) => {
    const thresholdCrossed = isSelf ? info.offset.x < -50 : info.offset.x > 50
    if (thresholdCrossed) {
      onReply(msg)
    }
    hasTriggeredHaptic.current = false
  }

  const dragElastic = isSelf ? { left: 0.65, right: 0.02 } : { left: 0.02, right: 0.65 }

  // Asynchronously decrypt the message on mount/key changes
  useEffect(() => {
    let active = true

    const decrypt = async () => {
      if (!dek) {
        setDecrypting(false)
        setDecryptedText("")
        return
      }
      try {
        setDecrypting(true)
        const text = await decryptTextMessage(msg.message_text, msg.encryption_iv, msg.encryption_tag, dek)
        if (active) {
          setDecryptedText(text)
          setDecryptionError(false)
        }
      } catch (err) {
        console.error("Message decryption failed:", err)
        if (active) {
          setDecryptionError(true)
        }
      } finally {
        if (active) {
          setDecrypting(false)
        }
      }
    }

    decrypt()
    return () => {
      active = false
    }
  }, [msg.message_text, msg.encryption_iv, msg.encryption_tag, dek])

  // Sync editText with decrypted text
  useEffect(() => {
    if (decryptedText) {
      setEditText(decryptedText)
    }
  }, [decryptedText])

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    })
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = editText.trim()
    if (!trimmed || !dek || updateMutation.isPending) return

    try {
      const encrypted = await encryptTextMessage(trimmed, dek)
      await updateMutation.mutateAsync({
        messageId: msg.id,
        payload: {
          message_text: encrypted.ciphertext,
          encryption_iv: encrypted.iv,
          encryption_tag: encrypted.tag
        }
      })
      setIsEditing(false)
      haptic.trigger("success")
    } catch (err) {
      haptic.trigger("error")
      toast.error("Failed to edit message.")
    }
  }

  const handleDelete = async () => {
    if (deleteMutation.isPending) return
    try {
      await deleteMutation.mutateAsync(msg.id)
      haptic.trigger("success")
      setDeleteDialogOpen(false)
    } catch (err) {
      haptic.trigger("error")
      toast.error("Failed to delete message.")
    }
  }

  const canEdit = isSelf && isWithinEditWindow
  const canDelete = isSelf || isOrganizer

  // Check if we need to clear the animated signatures (new chat session)
  if (chatOpenedAt !== lastChatOpenedAt) {
    lastChatOpenedAt = chatOpenedAt
    animatedSignatures.clear()
  }

  const isTemp = msg.id.startsWith("temp-")
  const messageSignature = msg.encryption_iv ? `${msg.user_id}-${msg.encryption_iv}` : msg.id
  const hasAlreadyAnimated = animatedSignatures.has(messageSignature)

  const isNew = !hasAlreadyAnimated && (isTemp || (chatOpenedAt !== null && new Date(msg.created_at).getTime() > chatOpenedAt))
  const [animationOrigin, setAnimationOrigin] = useState({ x: 0, y: 0, scale: 0.3, opacity: 0 })
  const [isReadyToAnimate, setIsReadyToAnimate] = useState(false)

  useLayoutEffect(() => {
    if (isNew) {
      const timer = setTimeout(() => {
        const bubbleEl = document.getElementById(`msg-${msg.id}`)
        const inputEl = document.getElementById("chat-input-field")
        if (isSelf && bubbleEl && inputEl) {
          const bubbleRect = bubbleEl.getBoundingClientRect()
          const inputRect = inputEl.getBoundingClientRect()

          const deltaX = (inputRect.left + inputRect.width / 2) - (bubbleRect.left + bubbleRect.width / 2)
          const deltaY = (inputRect.top + inputRect.height / 2) - (bubbleRect.top + bubbleRect.height / 2)

          setAnimationOrigin({ x: deltaX, y: deltaY, scale: 0.65, opacity: 0 })
          setIsReadyToAnimate(true)
        } else {
          setAnimationOrigin({ x: isSelf ? -80 : -120, y: isSelf ? 120 : 0, scale: isSelf ? 0.7 : 0.9, opacity: 0 })
          setIsReadyToAnimate(true)
        }
        animatedSignatures.add(messageSignature)
      }, 30)
      return () => clearTimeout(timer)
    } else {
      setIsReadyToAnimate(true)
      if (!hasAlreadyAnimated) {
        animatedSignatures.add(messageSignature)
      }
    }
  }, [msg.id, isNew, messageSignature, hasAlreadyAnimated, isSelf])

  const transitionAnimation = isNew
    ? { type: "spring", stiffness: 220, damping: 20 }
    : { type: "spring", stiffness: 350, damping: 28 }

  const shouldRenderHidden = isNew && !isReadyToAnimate

  const rowInitial = isNew ? { opacity: 0, y: 15 } : { opacity: 1, y: 0 }
  const rowAnimate = { opacity: 1, y: 0 }
  const rowTransition = { type: "spring", stiffness: 350, damping: 28 }

  const bubbleContent = (
    <motion.div
      id={`msg-${msg.id}`}
      initial={hasAlreadyAnimated ? { opacity: 1, y: 0, x: 0, scale: 1 } : isNew ? animationOrigin : { opacity: 0, y: 15, x: 0, scale: 1 }}
      animate={{
        opacity: shouldRenderHidden ? 0 : 1,
        y: shouldRenderHidden ? animationOrigin.y : 0,
        x: shouldRenderHidden ? animationOrigin.x : 0,
        scale: shouldRenderHidden ? animationOrigin.scale : 1
      }}
      transition={transitionAnimation}
      className={`text-left cursor-pointer sm:cursor-auto px-4 py-2.5 rounded-[20px] text-[14px] leading-relaxed break-words relative overflow-hidden select-text ${isSelf
        ? "bg-primary text-primary-foreground rounded-br-sm shadow-sm"
        : "bg-white/5 border border-white/10 text-foreground rounded-bl-sm shadow-md dark:shadow-sm"
        }`}
    >
      {/* Parent Message Reply Quote Block */}
      {msg.parent && (
        <div className="ignore-drawer-click">
          <ParentMessageQuote parent={msg.parent} dek={dek} isSelf={isSelf} />
        </div>
      )}

      {decrypting ? (
        <span className="text-[13px] italic opacity-70 animate-pulse">Decrypting message...</span>
      ) : decryptionError ? (
        <span className="text-[13px] italic flex items-center gap-1.5 opacity-80 text-rose-300">
          <Warning size={16} />
          Unable to decrypt
        </span>
      ) : (
        <span className="whitespace-pre-wrap block">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={decryptedText}
              initial={{ opacity: 0, filter: "blur(2px)", y: -4 }}
              animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              exit={{ opacity: 0, filter: "blur(2px)", y: 4 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="block"
            >
              {decryptedText}
            </motion.span>
          </AnimatePresence>
        </span>
      )}

      {/* Tagged Photos Grid Preview inside Message Bubble */}
      {msg.photos && msg.photos.length > 0 && (
        <div className={`ignore-drawer-click mt-2.5 grid gap-1 rounded-xl border border-white/10 overflow-hidden shadow-sm max-w-full ${msg.photos.length === 1
          ? "grid-cols-1 w-52"
          : msg.photos.length === 2 || msg.photos.length === 4
            ? "grid-cols-2 w-60"
            : "grid-cols-3 w-72"
          }`}>
          {msg.photos.map((photo) => (
            <div
              key={photo.id}
              onClick={(e) => {
                e.stopPropagation();
                onPhotoClick(photo.id, msg.photos)
              }}
              className={`relative group/photo w-full cursor-pointer overflow-hidden bg-muted ${msg.photos.length === 1 ? "aspect-[4/3]" : "aspect-square"
                }`}
            >
              <TaggedPhotoThumbnail photo={photo} dek={dek} isFullFill />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center text-white select-none backdrop-blur-[2px]">
                <Eye size={16} />
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );

  const mobileActionsPopover = isLargeScreen ? (
    bubbleContent
  ) : (
    <MobileMessageActions
      msg={msg}
      isSelf={isSelf}
      canEdit={canEdit}
      canDelete={canDelete}
      dropdownOpen={dropdownOpen}
      setDropdownOpen={handleSetDropdownOpen}
      clickCoords={clickCoords}
      onReply={onReply}
      setIsEditing={setIsEditing}
      setDeleteDialogOpen={setDeleteDialogOpen}
      decryptedText={decryptedText}
      currentUserId={currentUserId}
      toggleReactionMutation={toggleReactionMutation}
      haptic={haptic}
    >
      {bubbleContent}
    </MobileMessageActions>
  );

  return (
    <motion.div
      initial={rowInitial}
      animate={rowAnimate}
      exit={{
        opacity: 0,
        scale: 0.95,
        transition: {
          opacity: { duration: 0.1 },
          scale: { duration: 0.1 }
        }
      }}
      transition={rowTransition}
      className={`group flex w-full p-1 rounded-xl transition-colors duration-500 relative ${isSelf ? "justify-end" : "justify-start"}`}
    >
      {/* Reply Indicator (reveals when dragging row) */}
      <motion.div
        style={{
          opacity: replyIconOpacity,
          scale: replyIconScale,
          x: replyIconX,
        }}
        className={`absolute top-1/2 -translate-y-1/2 text-primary pointer-events-none flex items-center justify-center z-0 ${isSelf ? "right-4" : "left-4"
          }`}
      >
        <div className="p-1.5 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center">
          <ArrowBendUpLeft size={16} weight="bold" />
        </div>
      </motion.div>

      {/* Draggable message row content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={dragElastic}
        style={{ x: dragX }}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onTap={(e: any, info: any) => {
          if (isLargeScreen || isEditing) return

          const target = e.target as HTMLElement
          if (
            target?.closest("button") ||
            target?.closest("a") ||
            target?.closest("[role='button']") ||
            target?.closest(".ignore-drawer-click")
          ) {
            return
          }

          if (dropdownOpen) {
            handleSetDropdownOpen(false)
            return
          }

          const x = info?.point?.x ?? e?.clientX ?? (e?.changedTouches?.[0]?.clientX) ?? 0
          const y = info?.point?.y ?? e?.clientY ?? (e?.changedTouches?.[0]?.clientY) ?? 0
          setClickCoords({ x, y })
          handleSetDropdownOpen(true)
        }}
        className={`flex gap-3 max-w-[95%] sm:max-w-[90%] relative z-10 touch-pan-y ${isSelf ? "flex-row-reverse" : "flex-row"}`}
      >
        {/* Sender Avatar */}
        <Avatar className="w-8 h-8 shrink-0 select-none border border-white/10 shadow-sm mt-auto mb-1">
          {msg.user?.selfie_url && <AvatarImage src={getCachedProfilePhoto(msg.user_id, msg.user.selfie_url)} alt={msg.user.name} className="object-cover" />}
          <AvatarFallback className="bg-white/10 text-foreground text-[10px] font-bold">
            {msg.user?.name ? msg.user.name.substring(0, 2).toUpperCase() : "?"}
          </AvatarFallback>
        </Avatar>

        {/* Bubble & Actions Wrapper */}
        <div className={`flex flex-col gap-1.5 ${isSelf ? "items-end" : "items-start"}`}>

          {/* Name and Time Header */}
          <div className={`flex items-center gap-1.5 text-[11px] px-1`}>
            <span className="font-medium text-foreground/80 capitalize">{msg.user?.name || "Guest"}</span>
            <span className="text-muted-foreground/60 font-medium">{formatTime(msg.created_at)}</span>
            {msg.updated_at && new Date(msg.updated_at).getTime() - new Date(msg.created_at).getTime() > 1000 && (
              <span className="text-[10px] text-muted-foreground/50 italic" title={`Edited at ${formatTime(msg.updated_at)}`}>(edited)</span>
            )}
            {statusIcon}
          </div>

          <div className={`relative flex items-end gap-2 ${isSelf ? "flex-row-reverse" : "flex-row"}`}>

            {isEditing ? (
              <div
                className={`px-4 py-2.5 rounded-[20px] text-[14px] leading-relaxed break-words relative overflow-hidden select-text ${isSelf
                  ? "bg-primary text-primary-foreground rounded-br-sm shadow-sm"
                  : "bg-white/5 border border-white/10 text-foreground rounded-bl-sm shadow-md dark:shadow-sm"
                  }`}
              >
                {/* Parent Message Reply Quote Block */}
                {msg.parent && (
                  <ParentMessageQuote parent={msg.parent} dek={dek} isSelf={isSelf} />
                )}

                <form onSubmit={handleEditSubmit} className="flex flex-col gap-2 min-w-[200px] sm:min-w-[240px]">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full text-[13px] bg-primary-foreground/5 border border-primary-foreground/20 rounded-xl p-2.5 focus:outline-none focus:border-primary-foreground/40 text-primary-foreground resize-none"
                    rows={2}
                    maxLength={1000}
                    autoFocus
                    onFocus={(e) => {
                      const val = e.currentTarget.value;
                      e.currentTarget.setSelectionRange(val.length, val.length);
                    }}
                  />
                  <div className="flex justify-end gap-2 mt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(false)}
                      className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 h-7 text-[11px] rounded-lg"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!editText.trim() || updateMutation.isPending}
                      className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 h-7 text-[11px] rounded-lg font-bold"
                    >
                      {updateMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </form>
              </div>
            ) : showActionsTooltip ? (
              <Popover open={showActionsTooltip} onOpenChange={(open) => {
                if (!open && onDismissTooltip) {
                  onDismissTooltip();
                }
              }}>
                <PopoverTrigger asChild>
                  <div>
                    {mobileActionsPopover}
                  </div>
                </PopoverTrigger>
                <PopoverContent side="top" align={isSelf ? "end" : "start"} className="w-72 p-3 bg-neutral-900 border border-neutral-800 text-white rounded-xl shadow-xl z-50">
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold">Message Actions</p>
                    <p className="text-[11px] text-neutral-400">
                      Hover on desktop or tap on mobile to react, reply, edit, or delete messages!
                    </p>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDismissTooltip) onDismissTooltip();
                      }}
                      className="h-6 text-[10px] self-end bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg px-2 cursor-pointer"
                    >
                      Got it
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              mobileActionsPopover
            )}

            {/* Reactions Display */}
            <AnimatePresence>
              {msg.reactions && msg.reactions.length > 0 && (
                <Popover open={reactionDetailsOpen} onOpenChange={setReactionDetailsOpen}>
                  <PopoverTrigger asChild>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: 5 }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      className={`ignore-drawer-click absolute -bottom-3.5 ${isSelf ? "right-2" : "left-2"} flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full shadow-md transition-colors cursor-pointer select-none z-10 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 ${hasAnyReactionFromSelf
                          ? "text-primary"
                          : "text-foreground"
                        }`}
                    >
                      <div className="flex items-center gap-0.5">
                        {uniqueEmojis.map((emoji) => (
                          <span key={emoji} className="text-[13px] leading-none">{emoji}</span>
                        ))}
                      </div>
                      <span className={`font-semibold ml-0.5 pr-0.5 leading-none ${hasAnyReactionFromSelf
                          ? "text-primary"
                          : "text-foreground/90"
                        }`}>
                        {totalReactionsCount}
                      </span>
                    </motion.div>
                  </PopoverTrigger>
                  <PopoverContent side="top" align={isSelf ? "end" : "start"} className="w-64 p-3 shadow-xl rounded-xl">
                    <div className="flex gap-2 overflow-x-auto pb-2 mb-2 border-b scrollbar-none">
                      <button onClick={() => setActiveReactionTab("All")} className={`px-2 py-1 rounded-md text-sm whitespace-nowrap transition-colors ${activeReactionTab === "All" ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/50"}`}>
                        All {msg.reactions.length}
                      </button>
                      {Object.entries(reactionsByEmoji).map(([emoji, data]) => (
                        <button key={emoji} onClick={() => setActiveReactionTab(emoji)} className={`px-2 py-1 rounded-md text-sm flex items-center gap-1 whitespace-nowrap transition-colors ${activeReactionTab === emoji ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/50"}`}>
                          <span>{emoji}</span><span>{data.count}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-col max-h-48 overflow-y-auto gap-1 pr-1 scrollbar-thin">
                      {msg.reactions.filter(r => activeReactionTab === "All" || r.emoji === activeReactionTab).map(r => (
                        <div
                          key={r.id}
                          className={`flex items-center justify-between p-2 rounded-lg group transition-colors ${r.user_id === currentUserId ? "cursor-pointer hover:bg-muted" : "hover:bg-muted/50"}`}
                          onClick={() => {
                            if (r.user_id === currentUserId) {
                              haptic.trigger('light');
                              toggleReactionMutation.mutate({ messageId: msg.id, emoji: r.emoji });
                              setReactionDetailsOpen(false);
                            }
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={getCachedProfilePhoto(r.user_id, r.user?.selfie_url || undefined)} />
                              <AvatarFallback className="text-[10px]">{r.user?.name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium leading-tight">{r.user_id === currentUserId ? "You" : r.user?.name}</span>
                              {r.user_id === currentUserId && <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors leading-tight">Click to remove</span>}
                            </div>
                          </div>
                          <span className="text-lg">{r.emoji}</span>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </AnimatePresence>

            {/* Action Buttons (Reply / Pencil / Trash / React) */}
            {!isEditing && (
              <TooltipProvider>
                <div className={`ignore-drawer-click hidden sm:flex transition-opacity items-center gap-1 absolute z-20 bottom-1.5 ${isSelf
                  ? "right-full pr-3 flex-row-reverse"
                  : "left-full pl-3 flex-row"
                  } ${popoverOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onReply(msg)}
                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 cursor-pointer"
                      >
                        <ArrowBendUpLeft size={15} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Reply
                    </TooltipContent>
                  </Tooltip>

                  {canEdit && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsEditing(true)}
                          className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 cursor-pointer"
                        >
                          <Pencil size={15} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Edit message
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {canDelete && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { haptic.trigger("warning"); setDeleteDialogOpen(true); }}
                          className="h-8 w-8 rounded-full text-muted-foreground hover:text-red-400 hover:bg-red-400/10 cursor-pointer"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash size={15} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Delete
                      </TooltipContent>
                    </Tooltip>
                  )}

                  <Tooltip>
                    <Popover open={popoverOpen} onOpenChange={(open, eventDetails?: any) => {
                      if (!open && isTransitioningToFullPickerRef.current) {
                        eventDetails?.cancel?.()
                        return
                      }
                      setPopoverOpen(open)
                      if (!open) {
                        setShowFullPicker(false)
                      }
                    }}>
                      <PopoverTrigger asChild>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 cursor-pointer"
                          >
                            <Smiley size={15} />
                          </Button>
                        </TooltipTrigger>
                      </PopoverTrigger>
                      <PopoverPrimitive.Portal>
                        <PopoverPrimitive.Positioner
                          side="top"
                          align={isSelf ? "end" : "start"}
                          sideOffset={4}
                          className="isolate z-50 outline-none"
                        >
                          <PopoverPrimitive.Popup className="outline-none border-none bg-transparent shadow-none">
                            <AnimatePresence mode="wait">
                              {!showFullPicker ? (
                                <motion.div
                                  key="quick-reactions-container"
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  transition={{ duration: 0.15 }}
                                  className="bg-card border border-border shadow-xl p-2 flex flex-col justify-center items-center overflow-hidden w-[300px] h-[48px] rounded-full"
                                >
                                  <div className="flex items-center gap-1">
                                    {messageQuickEmojis.map((emoji) => {
                                      const isReacted = hasUserReactedWith(emoji);
                                      return (
                                        <button
                                          key={emoji}
                                          onClick={() => {
                                            haptic.trigger("light")
                                            toggleReactionMutation.mutate({ messageId: msg.id, emoji })
                                            setPopoverOpen(false)
                                          }}
                                          className={`h-8 w-8 rounded-full flex items-center justify-center text-lg hover:bg-muted transition-colors cursor-pointer ${isReacted ? "bg-neutral-200/50 dark:bg-white/15 shadow-inner" : ""
                                            }`}
                                        >
                                          {emoji}
                                        </button>
                                      );
                                    })}
                                    <button
                                      onPointerDown={(e) => {
                                        e.stopPropagation()
                                        e.nativeEvent.stopImmediatePropagation()
                                        isTransitioningToFullPickerRef.current = true
                                      }}
                                      onPointerUp={(e) => {
                                        e.stopPropagation()
                                        e.nativeEvent.stopImmediatePropagation()
                                      }}
                                      onMouseDown={(e) => {
                                        e.stopPropagation()
                                        e.nativeEvent.stopImmediatePropagation()
                                        isTransitioningToFullPickerRef.current = true
                                      }}
                                      onMouseUp={(e) => {
                                        e.stopPropagation()
                                        e.nativeEvent.stopImmediatePropagation()
                                      }}
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        e.nativeEvent.stopImmediatePropagation()
                                        haptic.trigger("light")
                                        isTransitioningToFullPickerRef.current = true
                                        setShowFullPicker(true)
                                        setTimeout(() => {
                                          isTransitioningToFullPickerRef.current = false
                                        }, 500)
                                      }}
                                      className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground cursor-pointer"
                                    >
                                      <Plus size={16} />
                                    </button>
                                  </div>
                                </motion.div>
                              ) : (
                                <motion.div
                                  key="full-picker-container"
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  transition={{ duration: 0.2 }}
                                  className="bg-card border border-border shadow-xl p-2 flex flex-col justify-center items-center overflow-hidden w-[350px] h-[400px] rounded-2xl"
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                  onPointerDown={(e) => e.stopPropagation()}
                                >
                                  <div className="w-[334px] h-[384px] flex flex-col">
                                    <EmojiPicker
                                      onEmojiClick={(emojiData) => {
                                        haptic.trigger("light")
                                        toggleReactionMutation.mutate({ messageId: msg.id, emoji: emojiData.emoji })
                                        setShowFullPicker(false)
                                        setPopoverOpen(false)
                                      }}
                                      theme={resolvedTheme === "dark" ? "dark" : "light"}
                                      lazyLoadEmojis={true}
                                      width={334}
                                      height={384}
                                      previewConfig={{ showPreview: false }}
                                      skinTonesDisabled={true}
                                    />
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </PopoverPrimitive.Popup>
                        </PopoverPrimitive.Positioner>
                      </PopoverPrimitive.Portal>
                    </Popover>
                    <TooltipContent>
                      React
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            )}
          </div>
        </div>
      </motion.div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => haptic.trigger("light")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}

const reactionsEqual = (a?: any[], b?: any[]) => {
  if (!a && !b) return true
  if (!a || !b) return false
  if (a.length !== b.length) return false
  return a.every((r, i) => r.id === b[i].id && r.emoji === b[i].emoji && r.user_id === b[i].user_id)
}

const attendeesEqual = (a: any[], b: any[]) => {
  if (a.length !== b.length) return false
  return a.every((att, i) => att.user_id === b[i].user_id && att.last_read_message_id === b[i].last_read_message_id)
}

export const ChatMessageItem = React.memo(ChatMessageItemComponent, (prev, next) => {
  return (
    prev.msg.id === next.msg.id &&
    prev.msg.message_text === next.msg.message_text &&
    prev.msg.updated_at === next.msg.updated_at &&
    prev.msg.status === next.msg.status &&
    reactionsEqual(prev.msg.reactions, next.msg.reactions) &&
    prev.dek === next.dek &&
    prev.isSelf === next.isSelf &&
    prev.isOrganizer === next.isOrganizer &&
    prev.index === next.index &&
    prev.showActionsTooltip === next.showActionsTooltip &&
    prev.chatOpenedAt === next.chatOpenedAt &&
    attendeesEqual(prev.attendees, next.attendees) &&
    prev.topEmojis.join(",") === next.topEmojis.join(",")
  )
})
