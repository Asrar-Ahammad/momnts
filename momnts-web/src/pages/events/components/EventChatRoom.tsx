import { useState, useRef, useEffect, useMemo } from "react"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { useChatMessages, useSendChatMessage, useUpdateChatMessage, useDeleteChatMessage, useToggleChatMessageReaction } from "@/features/chats/hooks/useChats"
import { chatsApi } from "@/features/chats/services/chats.api"

import { useEventAttendees } from "@/features/events/hooks/useEvents"
import { decryptTextMessage, encryptTextMessage } from "@/lib/crypto/e2ee"
import { useDecryptedPhoto } from "@/features/events/hooks/useDecryptedPhoto"
import { useQueryClient } from "@tanstack/react-query"
import { useWebHaptics } from "web-haptics/react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Lock,
  PaperPlaneRight,
  Image as ImageIcon,
  X,
  ArrowDown,
  ChatCircle,
  Warning,
  Eye,
  Pencil,
  Trash,
  ArrowBendUpLeft,
  Check,
  Smiley
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { ChatMessageData, ChatMessageParent } from "@/features/chats/services/chats.api"

interface EventChatRoomProps {
  eventId: string
  dek: CryptoKey | null
  photos: any[]
  onPhotoClick: (photoId: string) => void
  isOrganizer?: boolean
  onClose?: () => void
}

export default function EventChatRoom({
  eventId,
  dek,
  photos,
  onPhotoClick,
  isOrganizer = false,
  onClose
}: EventChatRoomProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const haptic = useWebHaptics()
  const scrollRef = useRef<HTMLDivElement>(null)

  const [inputText, setInputText] = useState("")
  const [selectedPhotos, setSelectedPhotos] = useState<any[]>([])
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false)
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessageData | null>(null)
  const [loadingOlder, setLoadingOlder] = useState(false)

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

  const handleStartReply = (msg: ChatMessageData) => {
    haptic.trigger("light")
    setReplyingToMessage(msg)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const { data: chatsData, isLoading } = useChatMessages(eventId)
  const sendMutation = useSendChatMessage(eventId)
  const { data: attendees = [] } = useEventAttendees(eventId)

  const messages = chatsData?.data || []

  // Mentions logic
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0)
  const [mentionState, setMentionState] = useState<{ query: string; startIdx: number; endIdx: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredAttendees = (mentionState && eventId)
    ? attendees.filter((a: any) => {
        const name = a.user?.name || ""
        return name.toLowerCase().includes(mentionState.query.toLowerCase())
      })
    : []

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
    handleTextChangeOrCursorMove(val, e.target.selectionStart || val.length)
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
    const name = attendee.user?.name || ""
    const before = inputText.slice(0, mentionState.startIdx)
    const after = inputText.slice(mentionState.endIdx)
    const newText = `${before}@${name} ${after}`
    setInputText(newText)
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
    if (mentionState && filteredAttendees.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveSuggestionIndex((prev) => (prev + 1) % filteredAttendees.length)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveSuggestionIndex(
          (prev) => (prev - 1 + filteredAttendees.length) % filteredAttendees.length
        )
        return
      }
      if (e.key === "Enter") {
        e.preventDefault()
        selectAttendee(filteredAttendees[activeSuggestionIndex])
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
    setShowScrollBottom(diff > 100)
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = inputText.trim()
    if ((!text && selectedPhotos.length === 0) || !dek || sendMutation.isPending) return

    try {
      // Extract mentioned user IDs before encryption
      const mentionedUserIds: string[] = []
      let textToSearch = text
      
      const sortedAttendees = [...attendees].sort((a, b) => (b.user?.name?.length || 0) - (a.user?.name?.length || 0))
      const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      
      for (const attendee of sortedAttendees) {
        if (!attendee.user?.name || attendee.user.id === user?.id) continue
        
        const namePattern = escapeRegExp(attendee.user.name)
        const regex = new RegExp(`(?:^|\\s)@(${namePattern})(?:$|\\s|[.,!?;:])`, 'i')
        
        if (regex.test(textToSearch)) {
          mentionedUserIds.push(attendee.user.id)
          textToSearch = textToSearch.replace(new RegExp(`@${namePattern}`, 'gi'), '')
        }
      }

      // Encrypt the message text client-side
      const encrypted = await encryptTextMessage(text || `Tagged ${selectedPhotos.length} photo${selectedPhotos.length === 1 ? "" : "s"}`, dek)
      
      await sendMutation.mutateAsync({
        message_text: encrypted.ciphertext,
        encryption_iv: encrypted.iv,
        encryption_tag: encrypted.tag,
        photo_ids: selectedPhotos.map(p => p.id),
        mentions: mentionedUserIds,
        parent_id: replyingToMessage?.id || undefined
      })

      haptic.trigger("success")
      setInputText("")
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
    <div className="flex flex-col h-full w-full bg-background relative overflow-hidden">
      
      {/* E2EE Header Banner */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/40 backdrop-blur-xl shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-full text-primary">
            <ChatCircle size={20} weight="fill" />
          </div>
          <div>
            <h3 className="font-semibold text-[15px] leading-tight">Event Chat</h3>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Lock size={10} weight="fill" className="text-purple-400" />
              End-to-End Encrypted
            </p>
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
              {messages.map((msg) => (
                <ChatMessageItem
                  key={msg.id}
                  msg={msg}
                  dek={dek}
                  isSelf={msg.user_id === user?.id}
                  allPhotos={photos}
                  onPhotoClick={onPhotoClick}
                  isOrganizer={isOrganizer}
                  onReply={handleStartReply}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
        </div>
      </div>

      {/* Floating Bottom Navigation Arrow */}
      <AnimatePresence>
        {showScrollBottom && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            onClick={() => scrollToBottom("smooth")}
            className="absolute bottom-[90px] right-6 bg-primary text-primary-foreground h-10 w-10 rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-all cursor-pointer z-50"
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
          {replyingToMessage && (
            <motion.div
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 10, height: 0 }}
              className="overflow-hidden"
            >
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mentions dropdown list */}
        {mentionState && filteredAttendees.length > 0 && (
          <div className="absolute bottom-full left-0 mb-2 w-full max-h-48 overflow-y-auto bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-xl z-50 p-1 flex flex-col gap-0.5 custom-scrollbar">
            {filteredAttendees.map((attendee: any, index: number) => {
              const isSelected = index === activeSuggestionIndex
              return (
                <button
                  key={attendee.id}
                  type="button"
                  onClick={() => selectAttendee(attendee)}
                  onMouseEnter={() => setActiveSuggestionIndex(index)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm cursor-pointer transition-colors w-full ${
                    isSelected
                      ? "bg-primary/20 text-foreground border border-primary/30"
                      : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6 shrink-0 border border-white/10">
                      {attendee.user?.selfie_url && <AvatarImage src={attendee.user.selfie_url} className="object-cover" />}
                      <AvatarFallback className="bg-muted text-[10px] font-bold text-foreground">
                        {attendee.user?.name ? attendee.user.name.substring(0, 2).toUpperCase() : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium capitalize">{attendee.user?.name}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

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

// ─── Chat Message Item Render (with async decryption) ────────────────
interface ChatMessageItemProps {
  msg: ChatMessageData
  dek: CryptoKey | null
  isSelf: boolean
  allPhotos: any[]
  onPhotoClick: (index: number) => void
  isOrganizer: boolean
  onReply: (msg: ChatMessageData) => void
}

function ChatMessageItem({
  msg,
  dek,
  isSelf,
  allPhotos,
  onPhotoClick,
  isOrganizer,
  onReply
}: ChatMessageItemProps) {
  const [decryptedText, setDecryptedText] = useState("")
  const [decryptionError, setDecryptionError] = useState(false)
  const [decrypting, setDecrypting] = useState(true)

  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState("")
  const [isWithinEditWindow, setIsWithinEditWindow] = useState(true)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [reactionDetailsOpen, setReactionDetailsOpen] = useState(false)
  const [activeReactionTab, setActiveReactionTab] = useState("All")
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
    haptic.trigger("warning")
    if (window.confirm("Are you sure you want to delete this message?")) {
      try {
        await deleteMutation.mutateAsync(msg.id)
        haptic.trigger("success")
      } catch (err) {
        haptic.trigger("error")
        toast.error("Failed to delete message.")
      }
    }
  }

  const canEdit = isSelf && isWithinEditWindow
  const canDelete = isSelf || isOrganizer

  return (
    <motion.div
      id={`msg-${msg.id}`}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
      className={`flex w-full p-1 rounded-xl transition-colors duration-500 ${isSelf ? "justify-end" : "justify-start"}`}
    >
      <div className={`flex gap-3 max-w-[95%] sm:max-w-[90%] ${isSelf ? "flex-row-reverse" : "flex-row"}`}>
        {/* Sender Avatar */}
        <Avatar className="w-8 h-8 shrink-0 select-none border border-white/10 shadow-sm mt-auto mb-1">
          {msg.user?.selfie_url && <AvatarImage src={msg.user.selfie_url} alt={msg.user.name} className="object-cover" />}
          <AvatarFallback className="bg-white/10 text-foreground text-[10px] font-bold">
            {msg.user?.name ? msg.user.name.substring(0, 2).toUpperCase() : "?"}
          </AvatarFallback>
        </Avatar>

        {/* Bubble & Actions Wrapper */}
        <div className={`flex flex-col gap-1.5 ${isSelf ? "items-end" : "items-start"}`}>
          
          {/* Name and Time Header */}
          <div className={`flex items-baseline gap-2 text-[11px] px-1`}>
            <span className="font-medium text-foreground/80 capitalize">{msg.user?.name || "Guest"}</span>
            <span className="text-muted-foreground/60 font-medium">{formatTime(msg.created_at)}</span>
            {msg.updated_at && new Date(msg.updated_at).getTime() - new Date(msg.created_at).getTime() > 1000 && (
              <span className="text-[10px] text-muted-foreground/50 italic" title={`Edited at ${formatTime(msg.updated_at)}`}>(edited)</span>
            )}
          </div>

          <div className={`group relative flex items-end gap-2 ${isSelf ? "flex-row-reverse" : "flex-row"}`}>
            
            {isEditing ? (
              <div
                className={`px-4 py-2.5 rounded-[20px] text-[14px] leading-relaxed shadow-sm break-words relative overflow-hidden select-text ${
                  isSelf
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-white/5 border border-white/10 text-foreground rounded-bl-sm"
                }`}
              >
                {/* Parent Message Reply Quote Block */}
                {msg.parent && (
                  <div
                    onClick={() => {
                      const el = document.getElementById(`msg-${msg.parent?.id}`);
                      if (el) {
                        el.scrollIntoView({ behavior: "smooth", block: "center" });
                        el.classList.add("bg-primary/20", "dark:bg-primary/30");
                        setTimeout(() => {
                          el.classList.remove("bg-primary/20", "dark:bg-primary/30");
                        }, 1500);
                      }
                    }}
                    className={`mb-2 p-2 rounded-lg text-[11px] cursor-pointer select-none transition-colors border-l-[3px] flex flex-col gap-0.5 bg-current/10 hover:bg-current/15 ${
                      isSelf 
                        ? "text-current/80 border-l-current/70" 
                        : "text-current/80 border-l-primary"
                    }`}
                  >
                    <span className={`font-bold text-[10px] leading-none ${isSelf ? "text-current" : "text-primary"}`}>
                      {msg.parent.user?.name || "Guest"}
                    </span>
                    <ParentMessageText parentMsg={msg.parent} dek={dek} />
                  </div>
                )}

                <form onSubmit={handleEditSubmit} className="flex flex-col gap-2 min-w-[200px] sm:min-w-[240px]">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full text-[13px] bg-primary-foreground/5 border border-primary-foreground/20 rounded-xl p-2.5 focus:outline-none focus:border-primary-foreground/40 text-primary-foreground resize-none"
                    rows={2}
                    maxLength={1000}
                    autoFocus
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
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger render={<div />}>
                  <div
                    className={`text-left cursor-pointer sm:cursor-auto px-4 py-2.5 rounded-[20px] text-[14px] leading-relaxed shadow-sm break-words relative overflow-hidden select-text ${
                      isSelf
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-white/5 border border-white/10 text-foreground rounded-bl-sm"
                    }`}
                  >
                    {/* Parent Message Reply Quote Block */}
                    {msg.parent && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          const el = document.getElementById(`msg-${msg.parent?.id}`);
                          if (el) {
                            el.scrollIntoView({ behavior: "smooth", block: "center" });
                            el.classList.add("bg-primary/20", "dark:bg-primary/30");
                            setTimeout(() => {
                              el.classList.remove("bg-primary/20", "dark:bg-primary/30");
                            }, 1500);
                          }
                        }}
                        className={`mb-2 p-2 rounded-lg text-[11px] cursor-pointer select-none transition-colors border-l-[3px] flex flex-col gap-0.5 bg-current/10 hover:bg-current/15 ${
                          isSelf 
                            ? "text-current/80 border-l-current/70" 
                            : "text-current/80 border-l-primary"
                        }`}
                      >
                        <span className={`font-bold text-[10px] leading-none ${isSelf ? "text-current" : "text-primary"}`}>
                          {msg.parent.user?.name || "Guest"}
                        </span>
                        <ParentMessageText parentMsg={msg.parent} dek={dek} />
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
                      <span className="whitespace-pre-wrap">{decryptedText}</span>
                    )}

                    {/* Tagged Photos Grid Preview inside Message Bubble */}
                    {msg.photos && msg.photos.length > 0 && (
                      <div className={`mt-2.5 grid gap-1 rounded-xl border border-white/10 overflow-hidden shadow-sm max-w-full ${
                        msg.photos.length === 1 
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
                              onPhotoClick(photo.id)
                            }}
                            className={`relative group/photo w-full cursor-pointer overflow-hidden bg-muted ${
                              msg.photos.length === 1 ? "aspect-[4/3]" : "aspect-square"
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
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isSelf ? "end" : "start"} className="sm:hidden w-auto min-w-[200px]">
                  <div className="flex items-center gap-1 px-2 py-2 mb-1 border-b">
                    {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          haptic.trigger("light");
                          toggleReactionMutation.mutate({ messageId: msg.id, emoji });
                        }}
                        className="h-7 w-7 rounded-full flex items-center justify-center text-lg hover:bg-muted transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <DropdownMenuItem onClick={() => onReply(msg)} className="cursor-pointer">
                    <ArrowBendUpLeft size={16} className="mr-2" />
                    Reply
                  </DropdownMenuItem>
                  {canEdit && (
                    <DropdownMenuItem onClick={() => setIsEditing(true)} className="cursor-pointer">
                      <Pencil size={16} className="mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem 
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                      className="cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10"
                    >
                      <Trash size={16} className="mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Reactions Display */}
            {msg.reactions && msg.reactions.length > 0 && (
              <Popover open={reactionDetailsOpen} onOpenChange={setReactionDetailsOpen}>
                <PopoverTrigger asChild>
                  <div className={`absolute -bottom-3 ${isSelf ? "right-2" : "left-2"} flex gap-1 z-10 cursor-pointer`}>
                    {Object.entries(reactionsByEmoji).map(([emoji, data]) => (
                      <div
                        key={emoji}
                        className={`flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full border shadow-sm transition-colors ${
                          data.hasReacted 
                            ? "bg-card border-primary text-primary" 
                            : "bg-card border-border text-foreground hover:bg-muted"
                        }`}
                      >
                        <span>{emoji}</span>
                        <span className="font-medium">{data.count}</span>
                      </div>
                    ))}
                  </div>
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
                            <AvatarImage src={r.user?.selfie_url || undefined} />
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

            {/* Action Buttons (Reply / Pencil / Trash / React) */}
            {!isEditing && (
              <div className={`hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity items-center gap-1 absolute z-20 bottom-1.5 ${
                isSelf 
                  ? "right-full pr-3 flex-row-reverse" 
                  : "left-full pl-3 flex-row"
              }`}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onReply(msg)}
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 cursor-pointer"
                  title="Reply to message"
                >
                  <ArrowBendUpLeft size={15} />
                </Button>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditing(true)}
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 cursor-pointer"
                    title="Edit message"
                  >
                    <Pencil size={15} />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDelete}
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-red-400 hover:bg-red-400/10 cursor-pointer"
                    title="Delete message"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash size={15} />
                  </Button>
                )}

                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 cursor-pointer"
                      title="React"
                    >
                      <Smiley size={15} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align={isSelf ? "end" : "start"} className="w-auto p-2 flex flex-row items-center gap-1 rounded-full shadow-xl">
                    {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          haptic.trigger("light");
                          toggleReactionMutation.mutate({ messageId: msg.id, emoji });
                          setPopoverOpen(false);
                        }}
                        className="h-8 w-8 rounded-full flex items-center justify-center text-lg hover:bg-muted transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Decrypted Photo Thumbnail Wrapper ───────────────────────────────
interface TaggedPhotoThumbnailProps {
  photo: any
  dek: CryptoKey | null
  isFullFill?: boolean
}

function TaggedPhotoThumbnail({ photo, dek, isFullFill = false }: TaggedPhotoThumbnailProps) {
  const isEncrypted = !!photo.encryption_iv && !!photo.encryption_tag
  const { url: decryptedUrl, error: decryptionError } = useDecryptedPhoto(
    photo.thumb_url,
    photo.encryption_iv || "",
    photo.encryption_tag || "",
    dek
  )

  const displayUrl = isEncrypted ? decryptedUrl : photo.thumb_url

  if (decryptionError) {
    return (
      <div className="w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-amber-500">
        <Warning size={16} />
      </div>
    )
  }

  if (isFullFill) {
    return displayUrl ? (
      <img src={displayUrl} alt="Tagged photo" className="w-full h-full object-cover" />
    ) : (
      <div className="w-full h-full bg-neutral-800 animate-pulse flex items-center justify-center">
        <span className="text-[10px] text-muted-foreground">Decrypting...</span>
      </div>
    )
  }

  return (
    <div className="w-10 h-10 rounded-lg overflow-hidden border border-border relative shrink-0">
      {displayUrl ? (
        <img src={displayUrl} alt="Preview" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-neutral-800 animate-pulse" />
      )}
    </div>
  )
}

// ─── Photo Picker Modal Dialog ───────────────────────────────────────
interface PhotoPickerModalProps {
  photos: any[]
  dek: CryptoKey | null
  initialSelected: any[]
  onSelect: (photos: any[]) => void
  onClose: () => void
}

function PhotoPickerModal({
  photos,
  dek,
  initialSelected,
  onSelect,
  onClose
}: PhotoPickerModalProps) {
  const [selected, setSelected] = useState<any[]>(initialSelected)

  const toggleSelect = (photo: any) => {
    if (selected.some((p) => p.id === photo.id)) {
      setSelected((prev) => prev.filter((p) => p.id !== photo.id))
    } else {
      setSelected((prev) => [...prev, photo])
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[70vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex flex-col">
            <span className="font-semibold text-sm">Select Photos to Tag</span>
            <span className="text-[10px] text-muted-foreground">{selected.length} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => onSelect(selected)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold rounded-full px-3 py-1 cursor-pointer h-7"
            >
              Done
            </Button>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-full cursor-pointer transition-colors"
            >
              <X size={16} weight="bold" />
            </button>
          </div>
        </div>

        {/* Photos Grid List */}
        <div className="flex-1 overflow-y-auto p-4">
          {photos.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No photos have been uploaded to this event yet.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {photos.map((photo) => {
                const isSelected = selected.some((p) => p.id === photo.id)
                return (
                  <div
                    key={photo.id}
                    onClick={() => toggleSelect(photo)}
                    className={`rounded-lg overflow-hidden aspect-square border cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all relative group bg-muted ${
                      isSelected ? "border-primary border-2" : "border-border"
                    }`}
                  >
                    <TaggedPhotoThumbnail photo={photo} dek={dek} isFullFill />
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                        <div className="bg-primary text-primary-foreground rounded-full p-1 shadow-lg">
                          <Check size={12} weight="bold" />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Replying Message Preview Component ──────────────────────────────
interface ReplyingMessagePreviewProps {
  msg: ChatMessageData
  dek: CryptoKey | null
}

function ReplyingMessagePreview({ msg, dek }: ReplyingMessagePreviewProps) {
  const [decryptedText, setDecryptedText] = useState("")
  const [decrypting, setDecrypting] = useState(true)

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
        }
      } catch (err) {
        console.error("Failed to decrypt reply preview:", err)
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

  if (decrypting) {
    return <p className="text-xs text-muted-foreground italic truncate">Decrypting...</p>
  }

  return (
    <p className="text-xs text-muted-foreground truncate leading-snug">
      {decryptedText || (msg.photos && msg.photos.length > 0 ? `📷 Tagged Photo${msg.photos.length === 1 ? "" : "s"}` : "Encrypted message")}
    </p>
  )
}

// ─── Parent Message Text Decryption Component ───────────────────────
interface ParentMessageTextProps {
  parentMsg: ChatMessageParent
  dek: CryptoKey | null
}

function ParentMessageText({ parentMsg, dek }: ParentMessageTextProps) {
  const [decryptedText, setDecryptedText] = useState("")
  const [decrypting, setDecrypting] = useState(true)

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
        const text = await decryptTextMessage(parentMsg.message_text, parentMsg.encryption_iv, parentMsg.encryption_tag, dek)
        if (active) {
          setDecryptedText(text)
        }
      } catch (err) {
        console.error("Failed to decrypt parent quote text:", err)
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
  }, [parentMsg.message_text, parentMsg.encryption_iv, parentMsg.encryption_tag, dek])

  if (decrypting) {
    return <span className="italic opacity-60">Decrypting...</span>
  }

  return <span className="opacity-80 line-clamp-1 break-all">{decryptedText || "Encrypted message"}</span>
}
