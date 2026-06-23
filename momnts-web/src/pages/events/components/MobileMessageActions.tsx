import React, { useState, useMemo } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import {
  ArrowBendUpLeft,
  Copy,
  Pencil,
  Trash,
  CaretDown
} from "@phosphor-icons/react"
import EmojiPicker from "emoji-picker-react"
import { toast } from "sonner"
import { ChatMessageData } from "@/features/chats/services/chats.api"

interface MobileMessageActionsProps {
  msg: ChatMessageData
  isSelf: boolean
  canEdit: boolean
  canDelete: boolean
  dropdownOpen: boolean
  setDropdownOpen: (open: boolean) => void
  clickCoords: { x: number; y: number } | null
  onReply: (msg: ChatMessageData) => void
  setIsEditing: (editing: boolean) => void
  setDeleteDialogOpen: (open: boolean) => void
  decryptedText: string
  currentUserId: string | undefined
  toggleReactionMutation: any
  haptic: any
  children: React.ReactNode
}

export function MobileMessageActions({
  msg,
  isSelf,
  canEdit,
  canDelete,
  dropdownOpen,
  setDropdownOpen,
  clickCoords,
  onReply,
  setIsEditing,
  setDeleteDialogOpen,
  decryptedText,
  currentUserId,
  toggleReactionMutation,
  haptic,
  children
}: MobileMessageActionsProps) {
  const { resolvedTheme } = useTheme()
  const [showMobilePicker, setShowMobilePicker] = useState(false)

  const mobileQuickEmojis = useMemo(() => {
    const defaults = ["😑", "❤️", "👍", "👎", "🔥", "🥰", "👏"]
    let list = [...defaults]

    // Find emojis that this user has reacted with to this message
    const myReactedEmojis = msg.reactions
      ? Array.from(new Set(msg.reactions.filter((r) => r.user_id === currentUserId).map((r) => r.emoji)))
      : []

    if (myReactedEmojis.length > 0) {
      for (let i = myReactedEmojis.length - 1; i >= 0; i--) {
        const reactedEmoji = myReactedEmojis[i]
        list = list.filter((e) => e !== reactedEmoji)
        list.unshift(reactedEmoji)
      }
    }
    return list.slice(0, 7)
  }, [msg.reactions, currentUserId])

  const hasUserReactedWith = (emoji: string) => {
    if (!msg.reactions || !currentUserId) return false
    return msg.reactions.some((r) => r.user_id === currentUserId && r.emoji === emoji)
  }

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(decryptedText)
      toast.success("Copied to clipboard!")
      haptic.trigger("success")
      setDropdownOpen(false)
    } catch (err) {
      toast.error("Failed to copy text.")
      haptic.trigger("error")
    }
  }

  const [stableCoords, setStableCoords] = useState<{ x: number; y: number } | null>(clickCoords)

  const isLeftHalfInitial = clickCoords ? clickCoords.x < (typeof window !== "undefined" ? window.innerWidth / 2 : 200) : !isSelf
  const sideInitial = clickCoords && clickCoords.y < 250 ? "bottom" : "top"
  const alignInitial = isLeftHalfInitial ? "start" : "end"

  const [stableSide, setStableSide] = useState<"top" | "bottom">(sideInitial)
  const [stableAlign, setStableAlign] = useState<"start" | "end">(alignInitial)

  React.useEffect(() => {
    if (dropdownOpen && clickCoords) {
      setStableCoords(clickCoords)
      const isLeft = clickCoords.x < (typeof window !== "undefined" ? window.innerWidth / 2 : 200)
      setStableAlign(isLeft ? "start" : "end")
      setStableSide(clickCoords.y < 250 ? "bottom" : "top")
    }
  }, [dropdownOpen, clickCoords])

  const side = stableSide
  const align = stableAlign
  const isLeftHalf = align === "start"

  return (
    <>
      <AnimatePresence>
        {dropdownOpen && typeof document !== "undefined" && createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[9999] cursor-pointer pointer-events-auto"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              haptic.trigger("light")
              setDropdownOpen(false)
            }}
          />,
          document.body
        )}
      </AnimatePresence>
      <Popover
        open={dropdownOpen}
        onOpenChange={(open) => {
          setDropdownOpen(open)
          if (!open) {
            setShowMobilePicker(false)
          }
        }}
      >
        <PopoverTrigger asChild>
        <div
          style={{
            position: "fixed",
            left: stableCoords ? `${stableCoords.x}px` : "0px",
            top: stableCoords ? `${stableCoords.y}px` : "0px",
            width: "1px",
            height: "1px",
            pointerEvents: "none",
            visibility: "hidden"
          }}
        />
      </PopoverTrigger>
      {children}
      <PopoverContent
        side={side}
        align={align}
        sideOffset={8}
        className={`ignore-drawer-click bg-transparent border-none ring-0 p-0 shadow-none outline-none flex flex-col gap-2 z-[10000] w-[300px] max-w-[95vw] ${
          isLeftHalf ? "items-start" : "items-end"
        }`}
        onClick={(e) => {
          e.stopPropagation()
          setDropdownOpen(false)
        }}
      >
        <div 
          className={`w-full flex flex-col gap-2 bg-transparent ${isLeftHalf ? "items-start" : "items-end"}`}
          onClick={(e) => {
            e.stopPropagation()
            setDropdownOpen(false)
          }}
        >
          {!showMobilePicker ? (
            <>
              {/* Reactions Pill Capsule */}
              <div 
                onClick={(e) => e.stopPropagation()}
                className="w-full flex items-center justify-between px-3 py-1.5 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-full shadow-xl gap-1"
              >
                {mobileQuickEmojis.map((emoji) => {
                  const isReacted = hasUserReactedWith(emoji)
                  return (
                    <button
                      key={emoji}
                      onClick={() => {
                        haptic.trigger("light")
                        toggleReactionMutation.mutate({ messageId: msg.id, emoji })
                        setDropdownOpen(false)
                      }}
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-lg hover:bg-neutral-100 dark:hover:bg-white/10 active:scale-125 transition-transform cursor-pointer font-normal ${
                        isReacted ? "bg-neutral-200 dark:bg-white/15 scale-105" : ""
                      }`}
                    >
                      {emoji}
                    </button>
                  )
                })}
                <button
                  onClick={() => {
                    haptic.trigger("light")
                    setShowMobilePicker(true)
                  }}
                  className="h-8 w-8 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-white/80 hover:bg-neutral-200 dark:hover:bg-white/20 active:scale-90 transition-transform cursor-pointer"
                >
                  <CaretDown size={16} weight="bold" />
                </button>
              </div>

              {/* Action Menu Capsule */}
              <div 
                onClick={(e) => e.stopPropagation()}
                className="w-[160px] max-w-full flex flex-col bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl p-1.5 gap-0.5"
              >
                <button
                  onClick={() => {
                    onReply(msg)
                    setDropdownOpen(false)
                  }}
                  className="flex items-center gap-3 w-full px-3.5 py-2.5 text-[13px] font-semibold rounded-xl text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/5 active:bg-neutral-200/50 dark:active:bg-white/10 transition-colors cursor-pointer text-left"
                >
                  <ArrowBendUpLeft size={18} className="text-neutral-500 dark:text-neutral-400" />
                  <span>Reply</span>
                </button>

                <div className="h-px bg-neutral-100 dark:bg-white/5 my-0.5" />

                <button
                  onClick={handleCopyText}
                  className="flex items-center gap-3 w-full px-3.5 py-2.5 text-[13px] font-semibold rounded-xl text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/5 active:bg-neutral-200/50 dark:active:bg-white/10 transition-colors cursor-pointer text-left"
                >
                  <Copy size={18} className="text-neutral-500 dark:text-neutral-400" />
                  <span>Copy Text</span>
                </button>

                {canEdit && (
                  <>
                    <div className="h-px bg-neutral-100 dark:bg-white/5 my-0.5" />
                    <button
                      onClick={() => {
                        setIsEditing(true)
                        setDropdownOpen(false)
                      }}
                      className="flex items-center gap-3 w-full px-3.5 py-2.5 text-[13px] font-semibold rounded-xl text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/5 active:bg-neutral-200/50 dark:active:bg-white/10 transition-colors cursor-pointer text-left"
                    >
                      <Pencil size={18} className="text-neutral-500 dark:text-neutral-400" />
                      <span>Edit</span>
                    </button>
                  </>
                )}

                {canDelete && (
                  <>
                    <div className="h-px bg-neutral-100 dark:bg-white/5 my-0.5" />
                    <button
                      onClick={() => {
                        haptic.trigger("warning")
                        setDeleteDialogOpen(true)
                        setDropdownOpen(false)
                      }}
                      className="flex items-center gap-3 w-full px-3.5 py-2.5 text-[13px] font-bold rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 active:bg-rose-100 dark:active:bg-rose-500/15 transition-colors cursor-pointer text-left"
                    >
                      <Trash size={18} className="text-rose-600 dark:text-rose-400" />
                      <span>Delete</span>
                    </button>
                  </>
                )}
              </div>
            </>
          ) : (
            <div
              className="w-full bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-2.5 flex flex-col items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full flex justify-between items-center mb-1 px-1">
                <span className="text-[12px] font-bold text-neutral-500 dark:text-neutral-400">Reactions</span>
                <button
                  onClick={() => setShowMobilePicker(false)}
                  className="text-primary hover:underline text-[12px] font-bold cursor-pointer active:scale-95 transition-transform"
                >
                  Back
                </button>
              </div>
              <div className="w-full flex justify-center overflow-hidden pb-1">
                <EmojiPicker
                  onEmojiClick={(emojiData) => {
                    haptic.trigger("light")
                    toggleReactionMutation.mutate({ messageId: msg.id, emoji: emojiData.emoji })
                    setShowMobilePicker(false)
                    setDropdownOpen(false)
                  }}
                  theme={resolvedTheme === "dark" ? "dark" : "light"}
                  lazyLoadEmojis={true}
                  width={280}
                  height={260}
                  previewConfig={{ showPreview: false }}
                  skinTonesDisabled={true}
                />
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
    </>
  )
}
