import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Dialog, DialogContent, DialogClose } from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { X, CaretLeft, CaretRight, XIcon, Trash, Heart, ChatCircle, Keyboard, Warning, PaperPlaneRight, PaperPlaneTiltIcon } from '@phosphor-icons/react'
import { PhotoData } from '../../../features/events/services/photos.api'
import { CommentsSection } from '../../../features/comments/components/CommentsSection'
import { useComments } from '../../../features/comments/hooks/useComments'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../components/ui/alert-dialog"
import { cn } from '../../../lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../../../components/ui/tooltip'
import { Kbd } from '../../../components/ui/kbd'
import { motion, AnimatePresence } from 'framer-motion'
import { useWebHaptics } from 'web-haptics/react'
import { useDecryptedPhoto, preloadAndDecryptPhoto } from '@/features/events/hooks/useDecryptedPhoto'

interface PhotoCarouselProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  photos: PhotoData[]
  initialIndex: number
  onDelete?: (photoId: string) => Promise<void> | void
  currentUserId?: string
  userRole?: string
  isEventActive?: boolean
  isFavourite?: (photoId: string) => boolean
  onToggleFavourite?: (photoId: string) => void
  highlightCommentId?: string
  dek?: CryptoKey | null
  onTagInChat?: (photo: PhotoData) => void
}

// Preload an image and return a promise
const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = src
  })
}

const PhotoCarousel = ({
  open,
  onOpenChange,
  photos,
  initialIndex,
  onDelete,
  currentUserId,
  userRole,
  isEventActive,
  isFavourite,
  onToggleFavourite,
  highlightCommentId,
  dek,
  onTagInChat
}: PhotoCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isLoading, setIsLoading] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showKeyHint, setShowKeyHint] = useState(false)
  const [isCommentsExpanded, setIsCommentsExpanded] = useState(false)
  const preloadedRef = useRef<Set<string>>(new Set())
  const lastScrollTopRef = useRef(0)
  const isTransitioningRef = useRef(false)
  const haptic = useWebHaptics()

  // Automatically open comments when highlighted comment is passed
  useEffect(() => {
    if (open && highlightCommentId) {
      setShowComments(true)
      setIsCommentsExpanded(true)
    }
  }, [open, highlightCommentId])

  // Reset showComments and expansion when modal closes/opens
  useEffect(() => {
    if (!open) {
      setShowComments(false)
      setIsCommentsExpanded(false)
    }
  }, [open])

  // Reset comments expansion state and scroll tracking when comments panel closes
  useEffect(() => {
    if (!showComments) {
      setIsCommentsExpanded(false)
    }
    lastScrollTopRef.current = 0
  }, [showComments])

  // Reset comments expansion state and scroll tracking when photo index changes
  useEffect(() => {
    setIsCommentsExpanded(false)
    lastScrollTopRef.current = 0
  }, [currentIndex])

  const handleCommentsScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget

    // Return early if content fits within container to prevent elastic scroll glitch
    if (scrollHeight <= clientHeight) return

    const prevScrollTop = lastScrollTopRef.current
    lastScrollTopRef.current = scrollTop

    if (isTransitioningRef.current) return

    if (scrollTop > prevScrollTop && scrollTop > 30) {
      if (!isCommentsExpanded) {
        isTransitioningRef.current = true
        setIsCommentsExpanded(true)
        setTimeout(() => {
          isTransitioningRef.current = false
        }, 400)
      }
    } else if (scrollTop <= 5) {
      if (isCommentsExpanded) {
        isTransitioningRef.current = true
        setIsCommentsExpanded(false)
        setTimeout(() => {
          isTransitioningRef.current = false
        }, 400)
      }
    }
  }, [isCommentsExpanded])

  // Show keyboard navigation hint for 3 seconds when carousel opens
  useEffect(() => {
    if (open) {
      setShowKeyHint(true)
      const timer = setTimeout(() => {
        setShowKeyHint(false)
      }, 3000)
      return () => clearTimeout(timer)
    } else {
      setShowKeyHint(false)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex)
    }
  }, [initialIndex, open])

  // Preload adjacent images (prev, next, and a couple beyond)
  const preloadAdjacentImages = useCallback((index: number) => {
    if (photos.length === 0) return

    const indicesToPreload = [
      (index - 1 + photos.length) % photos.length,
      (index + 1) % photos.length,
      (index + 2) % photos.length,
      (index - 2 + photos.length) % photos.length,
    ]

    indicesToPreload.forEach((i) => {
      const photo = photos[i]
      if (!photo) return
      const url = photo.display_url
      if (url && !preloadedRef.current.has(url)) {
        preloadedRef.current.add(url)
        const isEncrypted = !!(photo.encryption_iv && photo.encryption_tag)
        if (isEncrypted && dek) {
          preloadAndDecryptPhoto(url, photo.encryption_iv, photo.encryption_tag, dek)
        } else {
          preloadImage(url)
        }
      }
    })
  }, [photos, dek])

  // Preload adjacent images when index changes
  useEffect(() => {
    preloadAdjacentImages(currentIndex)
  }, [currentIndex, preloadAdjacentImages])

  // Preload all images when dialog opens
  useEffect(() => {
    if (open && photos.length > 0) {
      // Preload current + adjacent first for immediate responsiveness
      const currentPhoto = photos[initialIndex]
      if (currentPhoto) {
        const currentUrl = currentPhoto.display_url
        if (currentUrl) {
          const isEncrypted = !!(currentPhoto.encryption_iv && currentPhoto.encryption_tag)
          if (isEncrypted && dek) {
            preloadAndDecryptPhoto(currentUrl, currentPhoto.encryption_iv, currentPhoto.encryption_tag, dek)
          } else {
            preloadImage(currentUrl)
          }
        }
      }
      preloadAdjacentImages(initialIndex)

      // Then preload remaining images in background
      window.requestIdleCallback?.(() => {
        photos.forEach((photo) => {
          if (!preloadedRef.current.has(photo.display_url)) {
            preloadedRef.current.add(photo.display_url)
            const isEncrypted = !!(photo.encryption_iv && photo.encryption_tag)
            if (isEncrypted && dek) {
              preloadAndDecryptPhoto(photo.display_url, photo.encryption_iv, photo.encryption_tag, dek)
            } else {
              preloadImage(photo.display_url)
            }
          }
        })
      }) ?? setTimeout(() => {
        photos.forEach((photo) => {
          if (!preloadedRef.current.has(photo.display_url)) {
            preloadedRef.current.add(photo.display_url)
            const isEncrypted = !!(photo.encryption_iv && photo.encryption_tag)
            if (isEncrypted && dek) {
              preloadAndDecryptPhoto(photo.display_url, photo.encryption_iv, photo.encryption_tag, dek)
            } else {
              preloadImage(photo.display_url)
            }
          }
        })
      }, 200)
    }
  }, [open, photos, initialIndex, preloadAdjacentImages, dek])

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))
    haptic.trigger("selection")
  }, [photos.length, haptic])

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0))
    haptic.trigger("selection")
  }, [photos.length, haptic])

  const handleKeyDown = useCallback((e: KeyboardEvent | React.KeyboardEvent) => {
    const activeEl = document.activeElement
    if (activeEl) {
      const tagName = activeEl.tagName.toLowerCase()
      const isInput = tagName === 'input' || tagName === 'textarea' || activeEl.hasAttribute('contenteditable')
      if (isInput) return
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      goToPrevious()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      goToNext()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onOpenChange(false)
    }
  }, [goToPrevious, goToNext, onOpenChange])

  useEffect(() => {
    if (open) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleKeyDown])

  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight })
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null)

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex)
      setNaturalSize(null) // Reset natural size when image changes
    }
  }, [initialIndex, open])

  const [imageError, setImageError] = useState(false)

  // Reset natural size, error state, and show loading spinner when index changes
  useEffect(() => {
    setNaturalSize(null)
    setIsLoading(true)
    setImageError(false)
  }, [currentIndex])

  const currentPhoto = photos[currentIndex]
  const isEncrypted = !!(currentPhoto?.encryption_iv && currentPhoto?.encryption_tag)

  const { url: decryptedDisplayUrl, error: decryptionError } = useDecryptedPhoto(
    currentPhoto?.display_url,
    currentPhoto?.encryption_iv,
    currentPhoto?.encryption_tag,
    dek
  )

  const displayUrl = isEncrypted ? decryptedDisplayUrl : currentPhoto?.display_url

  useEffect(() => {
    if (decryptionError) {
      setIsLoading(false)
      setImageError(true)
    }
  }, [decryptionError])

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoading(false)
    const { naturalWidth, naturalHeight } = e.currentTarget
    setNaturalSize({ width: naturalWidth, height: naturalHeight })
  }

  const handleImageError = () => {
    setIsLoading(false)
    setImageError(true)
  }

  // Compute dialog size from photo aspect ratio to fill viewport
  const dialogStyle = useMemo(() => {
    if (photos.length === 0 || !currentPhoto) return { width: 0, height: 0, photoHeight: 0, commentsHeight: 0 }

    const viewportW = windowSize.width * 0.95
    // Adjust maximum photo height if comments are open
    const commentsHeight = showComments
      ? (isCommentsExpanded ? Math.min(windowSize.height * 0.65, 520) : Math.min(windowSize.height * 0.4, 320))
      : 0
    const viewportH = windowSize.height * 0.95 - commentsHeight

    const naturalW = currentPhoto.width || naturalSize?.width
    const naturalH = currentPhoto.height || naturalSize?.height

    if (!naturalW || !naturalH) {
      // Unknown dimensions — use a safe medium size while loading
      const defaultPhotoH = Math.min(viewportH, 450)
      let targetW = Math.min(viewportW, 600)
      if (showComments && windowSize.width >= 768) {
        targetW = Math.min(viewportW, Math.max(targetW, 480))
      }
      return {
        width: targetW,
        height: defaultPhotoH + commentsHeight,
        photoHeight: defaultPhotoH,
        commentsHeight
      }
    }

    const photoRatio = naturalW / naturalH
    const viewportRatio = viewportW / viewportH

    let targetW: number, targetH: number

    if (photoRatio > viewportRatio) {
      // Photo is wider than the allowed viewport area
      targetW = viewportW
      targetH = viewportW / photoRatio
    } else {
      // Photo is taller than the allowed viewport area
      targetH = viewportH
      targetW = viewportH * photoRatio
    }

    // Don't upscale small photos beyond their natural size
    if (targetW > naturalW && targetH > naturalH) {
      targetW = naturalW
      targetH = naturalH
    }

    // Enforce a global minimum width to prevent UI clipping/wrapping in portrait aspect ratios
    const globalMinWidth = Math.min(viewportW, 380)
    targetW = Math.max(targetW, globalMinWidth)

    // Enforce a minimum width in desktop view when comments are open so it's not too narrow
    if (showComments && windowSize.width >= 768) {
      targetW = Math.min(viewportW, Math.max(targetW, 480))
    }

    return {
      width: targetW,
      height: targetH + commentsHeight,
      photoHeight: targetH,
      commentsHeight
    }
  }, [photos.length, currentPhoto, naturalSize, windowSize, showComments, isCommentsExpanded])

  const canDelete = userRole === 'ORGANIZER' || (isEventActive && currentUserId === currentPhoto?.user_id)

  const handleDelete = async () => {
    if (isDeleting) return
    try {
      setIsDeleting(true)
      await onDelete?.(currentPhoto.id)
      setDeleteConfirmOpen(false)
      onOpenChange(false)
    } finally {
      setIsDeleting(false)
    }
  }

  const { data: commentsData } = useComments(open ? (currentPhoto?.id || '') : '')

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="w-auto max-w-none sm:max-w-none p-0 bg-black border-0 overflow-hidden transition-[width,height] duration-300 ease-out shadow-2xl gap-0 data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 rounded-3xl"
          style={{ width: dialogStyle.width, height: dialogStyle.height }}
          showCloseButton={false}
          onKeyDown={handleKeyDown}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Hidden focus trap to prevent auto-focusing the first button and triggering its tooltip */}
          <div tabIndex={0} className="sr-only" />

          {currentPhoto && (
            <div className="relative flex flex-col w-full h-full">
              {/* Photo Container */}
              <div
                style={{ width: dialogStyle.width, height: dialogStyle.photoHeight }}
                className="relative flex items-center justify-center bg-black transition-[width,height] duration-300 ease-out"
              >
                {/* Header / Action Buttons */}
                <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                  {currentPhoto && onToggleFavourite && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center justify-center cursor-pointer transition-all duration-200",
                            isFavourite?.(currentPhoto.id)
                              ? "text-rose-500 hover:text-rose-600 hover:bg-rose-50/10 scale-105"
                              : "text-white/80 hover:text-rose-500 hover:bg-black/80 hover:scale-105"
                          )}
                          onClick={() => onToggleFavourite(currentPhoto.id)}
                        >
                          <Heart size={20} weight={isFavourite?.(currentPhoto.id) ? "fill" : "bold"} className={isFavourite?.(currentPhoto.id) ? "text-rose-500" : ""} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="hidden md:flex bg-neutral-900 border border-neutral-800 text-neutral-200">
                        {isFavourite?.(currentPhoto.id) ? "Remove from Favourites" : "Add to Favourites"}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {currentPhoto && (
                    <div className="relative">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center justify-center cursor-pointer transition-all duration-200",
                              showComments
                                ? "text-sky-400 hover:text-sky-500 hover:bg-sky-50/10 scale-105"
                                : "text-white/80 hover:text-sky-400 hover:bg-black/80 hover:scale-105"
                            )}
                            onClick={() => setShowComments(!showComments)}
                          >
                            <ChatCircle size={20} weight={showComments ? "fill" : "bold"} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="hidden md:flex bg-neutral-900 border border-neutral-800 text-neutral-200">
                          {showComments ? "Hide Comments" : "Show Comments"}
                        </TooltipContent>
                      </Tooltip>
                      {commentsData && commentsData.total > 0 && (
                        <span className="absolute -top-1 -right-1 bg-sky-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center border border-neutral-950 scale-90 pointer-events-none">
                          {commentsData.total > 9 ? "9+" : commentsData.total}
                        </span>
                      )}
                    </div>
                  )}
                  {currentPhoto && onTagInChat && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center justify-center cursor-pointer transition-all duration-200 text-white/80 hover:text-purple-400 hover:bg-black/80 hover:scale-105"
                          onClick={() => {
                            haptic.trigger("light");
                            onTagInChat(currentPhoto);
                          }}
                        >
                          <PaperPlaneTiltIcon size={20} weight="bold" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="hidden md:flex bg-neutral-900 border border-neutral-800 text-neutral-200">
                        Tag Photo in Chat
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {canDelete && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="bg-black/40 hover:bg-red-500 hover:text-white backdrop-blur-md text-white px-3 py-1.5 rounded-full border border-white/10 flex items-center justify-center cursor-pointer"
                          onClick={() => setDeleteConfirmOpen(true)}
                        >
                          <Trash size={20} weight="bold" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="hidden md:flex bg-neutral-900 border border-neutral-800 text-neutral-200">
                        Delete Photo
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <DialogClose asChild>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="bg-black/40 hover:bg-black/80 hover:text-white backdrop-blur-md text-white px-3 py-1.5 rounded-full border border-white/10 flex items-center justify-center gap-1"
                          onClick={() => { haptic.trigger("light"); onOpenChange(false) }}
                        >
                          <XIcon size={20} weight="bold" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="hidden md:flex bg-neutral-900 border border-neutral-800 text-neutral-200 items-center gap-1.5">
                        <span>Close</span>
                      </TooltipContent>
                    </Tooltip>
                  </DialogClose>
                </div>

                {/* Navigation Controls */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 z-40 pointer-events-none">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="pointer-events-auto hover:text-white cursor-pointer h-8 w-8 md:h-12 md:w-12 bg-black/60 hover:bg-black/80 text-white border border-white/10 rounded-full transition-colors flex items-center justify-center"
                        onClick={goToPrevious}
                      >
                        <CaretLeft size={28} weight="bold" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="hidden md:flex bg-neutral-900 border border-neutral-800 text-neutral-200 items-center gap-1.5">
                      <span>Previous</span>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="pointer-events-auto hover:text-white cursor-pointer h-8 w-8 md:h-12 md:w-12 bg-black/60 hover:bg-black/80 text-white border border-white/10 rounded-full transition-colors flex items-center justify-center"
                        onClick={goToNext}
                      >
                        <CaretRight size={28} weight="bold" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="hidden md:flex bg-neutral-900 border border-neutral-800 text-neutral-200 items-center gap-1.5">
                      <span>Next</span>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Image Container */}
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    key={currentPhoto?.id}
                    src={displayUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'}
                    alt={`Photo ${currentIndex + 1}`}
                    className={cn(
                      "max-w-full max-h-full object-contain select-none transition-opacity duration-300",
                      isLoading ? "opacity-0" : "opacity-100"
                    )}
                    onLoad={(e) => {
                      if (!displayUrl) return
                      handleImageLoad(e)
                    }}
                    onError={() => {
                      if (!displayUrl) return
                      handleImageError()
                    }}
                  />
                  {imageError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400 p-4 text-center">
                      <Warning size={32} className="mb-2 text-neutral-400 dark:text-neutral-500" />
                      <span className="text-sm font-medium">Failed to load photo</span>
                    </div>
                  )}
                  <AnimatePresence>
                    {isLoading && !imageError && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 border-[3px] border-white/10 rounded-full" />
                            <div className="absolute inset-0 w-10 h-10 border-[3px] border-transparent border-t-white rounded-full animate-spin" />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-linear-to-t from-black/80 to-transparent pointer-events-none">
                  <div className="flex items-end justify-between gap-4">
                    <div className="flex flex-wrap gap-2 items-end">
                      {currentPhoto.user && (
                        <div className="bg-black/40 backdrop-blur-md text-white px-3 py-1.5 rounded-full border border-white/10 flex items-center justify-center gap-1 whitespace-nowrap shrink-0">
                          <p className="text-[11px] md:text-xs text-white/60 mb-0.5">Uploaded by</p>
                          <p className="text-[11px] md:text-xs font-semibold tracking-tight capitalize">{currentPhoto.user.name}</p>
                        </div>
                      )}
                      <AnimatePresence>
                        {showKeyHint && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, width: 0, marginLeft: 0 }}
                            animate={{ opacity: 1, scale: 1, width: "auto", marginLeft: 4 }}
                            exit={{ opacity: 0, scale: 0.9, width: 0, marginLeft: 0 }}
                            transition={{ duration: 0.4, ease: "easeInOut" }}
                            className="hidden md:flex bg-black/40 backdrop-blur-md text-white/80 px-3 py-1.5 rounded-full border border-white/10 text-[11px] md:text-xs items-center gap-1.5 select-none pointer-events-auto origin-left whitespace-nowrap shrink-0 overflow-hidden"
                          >
                            <Keyboard size={14} className="text-white/60" />
                            <span>Use keys</span>
                            <Kbd className="bg-white/10 text-white border-white/10">←</Kbd>
                            <Kbd className="bg-white/10 text-white border-white/10">→</Kbd>
                            <span>to browse</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="bg-black/40 backdrop-blur-md text-white px-4 py-2 rounded-full border border-white/10 text-xs font-medium tabular-nums select-none whitespace-nowrap shrink-0">
                      {currentIndex + 1} <span className="text-white/40 mx-1">/</span> {photos.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments Panel */}
              <div
                style={{ height: dialogStyle.commentsHeight }}
                className={cn(
                  "w-full bg-neutral-950 border-t border-neutral-900 flex flex-col text-white transition-[height,opacity] duration-300 ease-out overflow-hidden rounded-b-3xl dark",
                  showComments ? "opacity-100 animate-in slide-in-from-top duration-300" : "opacity-0 border-t-0"
                )}
              >
                {/* Comments Header */}
                <div className="flex justify-between items-center px-6 py-3 border-b border-neutral-900 shrink-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">Comments</h3>
                    {commentsData && commentsData.total > 0 && (
                      <span className="bg-neutral-800 text-neutral-200 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {commentsData.total}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-neutral-400 hover:text-white rounded-full cursor-pointer hover:bg-neutral-800/50"
                    onClick={() => setShowComments(false)}
                  >
                    <X size={18} />
                  </Button>
                </div>
                {/* Comments Content Area */}
                <div className="flex-1 flex flex-col min-h-0">
                  {showComments && (
                    <CommentsSection
                      photoId={currentPhoto.id}
                      eventId={currentPhoto.event_id}
                      currentUserId={currentUserId || ""}
                      isOrganizer={userRole === "ORGANIZER"}
                      hideHeader={true}
                      highlightCommentId={highlightCommentId}
                      onScroll={handleCommentsScroll}
                      onFocusInput={() => setIsCommentsExpanded(true)}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this photo? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => haptic.trigger("light")} disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => { 
                e.preventDefault()
                haptic.trigger("warning")
                await handleDelete() 
              }}
              className="bg-red-600 hover:bg-red-700 text-white min-w-[80px]"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}

export default PhotoCarousel
