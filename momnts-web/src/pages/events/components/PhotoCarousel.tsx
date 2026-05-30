import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Dialog, DialogContent, DialogClose } from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { X, CaretLeft, CaretRight, Trash, Heart, ChatCircle, Keyboard } from '@phosphor-icons/react'
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
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../../../components/ui/tooltip'

interface PhotoCarouselProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  photos: PhotoData[]
  initialIndex: number
  onDelete?: (photoId: string) => void
  currentUserId?: string
  userRole?: string
  isEventActive?: boolean
  isFavourite?: (photoId: string) => boolean
  onToggleFavourite?: (photoId: string) => void
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
  onToggleFavourite
}: PhotoCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isLoading, setIsLoading] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showNavHint, setShowNavHint] = useState(false)
  const preloadedRef = useRef<Set<string>>(new Set())

  // Reset showComments and trigger nav hint when modal closes/opens
  useEffect(() => {
    if (!open) {
      setShowComments(false)
      setShowNavHint(false)
    } else {
      setShowNavHint(true)
      const timer = setTimeout(() => {
        setShowNavHint(false)
      }, 4000)
      return () => clearTimeout(timer)
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
      const url = photos[i]?.display_url
      if (url && !preloadedRef.current.has(url)) {
        preloadedRef.current.add(url)
        preloadImage(url)
      }
    })
  }, [photos])

  // Preload adjacent images when index changes
  useEffect(() => {
    preloadAdjacentImages(currentIndex)
  }, [currentIndex, preloadAdjacentImages])

  // Preload all images when dialog opens
  useEffect(() => {
    if (open && photos.length > 0) {
      // Preload current + adjacent first for immediate responsiveness
      const currentUrl = photos[initialIndex]?.display_url
      if (currentUrl) preloadImage(currentUrl)
      preloadAdjacentImages(initialIndex)

      // Then preload remaining images in background
      window.requestIdleCallback?.(() => {
        photos.forEach((photo) => {
          if (!preloadedRef.current.has(photo.display_url)) {
            preloadedRef.current.add(photo.display_url)
            preloadImage(photo.display_url)
          }
        })
      }) ?? setTimeout(() => {
        photos.forEach((photo) => {
          if (!preloadedRef.current.has(photo.display_url)) {
            preloadedRef.current.add(photo.display_url)
            preloadImage(photo.display_url)
          }
        })
      }, 200)
    }
  }, [open, photos, initialIndex, preloadAdjacentImages])

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))
  }, [photos.length])

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0))
  }, [photos.length])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const activeEl = document.activeElement
    const isTyping = activeEl && (
      activeEl.tagName === 'INPUT' ||
      activeEl.tagName === 'TEXTAREA' ||
      activeEl.getAttribute('contenteditable') === 'true'
    )
    if (isTyping) {
      if (e.key === 'Escape') {
        onOpenChange(false)
      }
      return
    }

    if (e.key === 'ArrowLeft') {
      goToPrevious()
    } else if (e.key === 'ArrowRight') {
      goToNext()
    } else if (e.key === 'Escape') {
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

  // Reset natural size when index changes manually
  useEffect(() => {
    setNaturalSize(null)
  }, [currentIndex])

  const currentPhoto = photos[currentIndex]

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoading(false)
    const { naturalWidth, naturalHeight } = e.currentTarget
    setNaturalSize({ width: naturalWidth, height: naturalHeight })
  }

  // Compute dialog size from photo aspect ratio to fill viewport
  const dialogStyle = useMemo(() => {
    if (photos.length === 0 || !currentPhoto) return { width: 0, height: 0, photoHeight: 0, commentsHeight: 0 }

    const viewportW = windowSize.width * 0.95
    // Adjust maximum photo height if comments are open
    const commentsHeight = showComments ? Math.min(windowSize.height * 0.4, 320) : 0
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
  }, [photos.length, currentPhoto, naturalSize, windowSize, showComments])

  const canDelete = userRole === 'ORGANIZER' || (isEventActive && currentUserId === currentPhoto?.user_id)

  const handleDelete = () => {
    onDelete?.(currentPhoto.id)
    setDeleteConfirmOpen(false)
    onOpenChange(false)
  }

  const { data: commentsData } = useComments(open && showComments ? (currentPhoto?.id || '') : '')

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="w-auto max-w-none sm:max-w-none p-0 bg-black border-0 overflow-hidden transition-[width,height] duration-300 ease-out shadow-2xl gap-0 data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 rounded-3xl"
          style={{ width: dialogStyle.width, height: dialogStyle.height }}
          showCloseButton={false}
          onKeyDown={(e) => {
            const activeEl = document.activeElement
            const isTyping = activeEl && (
              activeEl.tagName === 'INPUT' ||
              activeEl.tagName === 'TEXTAREA' ||
              activeEl.getAttribute('contenteditable') === 'true'
            )
            if (isTyping) return

            if (e.key === 'ArrowLeft') {
              goToPrevious()
              e.preventDefault()
            } else if (e.key === 'ArrowRight') {
              goToNext()
              e.preventDefault()
            }
          }}
        >
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
                  )}
                  {currentPhoto && (
                    <div className="relative">
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
                      {commentsData && commentsData.total > 0 && (
                        <span className="absolute -top-1 -right-1 bg-sky-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center border border-neutral-950 scale-90 pointer-events-none">
                          {commentsData.total}
                        </span>
                      )}
                    </div>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-black/40 hover:bg-red-500 hover:text-white backdrop-blur-md text-white px-3 py-1.5 rounded-full border border-white/10 flex items-center justify-center cursor-pointer"
                      onClick={() => setDeleteConfirmOpen(true)}
                    >
                      <Trash size={20} weight="bold" />
                    </Button>
                  )}
                  <DialogClose asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-black/40 hover:bg-black/80 hover:text-white backdrop-blur-md text-white px-3 py-1.5 rounded-full border border-white/10 flex items-center justify-center gap-1"
                      onClick={() => onOpenChange(false)}
                    >
                      <X size={20} weight="bold" />
                    </Button>
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
                        aria-label="Previous photo"
                      >
                        <CaretLeft size={28} weight="bold" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-neutral-900 fill-neutral-900 text-white border border-white/10 shadow-2xl">
                      <span>Previous (←)</span>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="pointer-events-auto hover:text-white cursor-pointer h-8 w-8 md:h-12 md:w-12 bg-black/60 hover:bg-black/80 text-white border border-white/10 rounded-full transition-colors flex items-center justify-center"
                        onClick={goToNext}
                        aria-label="Next photo"
                      >
                        <CaretRight size={28} weight="bold" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="bg-neutral-900 fill-neutral-900 text-white border border-white/10 shadow-2xl">
                      <span>Next (→)</span>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Image Container */}
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    key={currentPhoto?.display_url}
                    src={currentPhoto?.display_url}
                    alt={`Photo ${currentIndex + 1}`}
                    className="max-w-full max-h-full object-contain select-none"
                    onLoadStart={() => setIsLoading(true)}
                    onLoad={handleImageLoad}
                  />
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="w-10 h-10 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Keyboard Navigation Hint */}
                <div 
                  className={cn(
                    "absolute bottom-20 left-1/2 -translate-x-1/2 z-50 bg-black/70 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full text-xs text-white/90 flex items-center gap-2 pointer-events-none transition-all duration-500 shadow-lg",
                    showNavHint ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95"
                  )}
                >
                  <Keyboard size={16} className="text-sky-400" />
                  <span>Tip: You can also use ← and → arrow keys to navigate</span>
                </div>

                {/* Footer Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-linear-to-t from-black/80 to-transparent pointer-events-none">
                  <div className="flex items-end justify-between">
                    {currentPhoto.user && (
                      <div className="bg-black/40 backdrop-blur-md text-white px-3 py-1.5 rounded-full border border-white/10 flex items-center justify-center gap-1">
                        <p className="text-[11px] md:text-xs text-white/60 mb-0.5">Uploaded by</p>
                        <p className="text-[11px] md:text-xs font-semibold tracking-tight capitalize">{currentPhoto.user.name}</p>
                      </div>
                    )}
                    <div className="bg-black/40 backdrop-blur-md text-white px-4 py-2 rounded-full border border-white/10 text-xs font-medium tabular-nums">
                      {currentIndex + 1} <span className="text-white/40 mx-1">/</span> {photos.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments Panel */}
              <div 
                style={{ height: dialogStyle.commentsHeight }}
                className={cn(
                  "w-full bg-neutral-950 border-t border-neutral-900 flex flex-col text-white transition-[height,opacity] duration-300 ease-out overflow-hidden rounded-b-3xl",
                  showComments ? "opacity-100 animate-in slide-in-from-top duration-300" : "opacity-0 border-t-0"
                )}
              >
                {/* Comments Header */}
                <div className="flex justify-between items-center px-6 py-3 border-b border-neutral-900">
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
                {/* Comments Scrollable Area */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar text-neutral-200 dark pt-4">
                  {showComments && (
                    <CommentsSection
                      photoId={currentPhoto.id}
                      currentUserId={currentUserId || ""}
                      isOrganizer={userRole === "ORGANIZER"}
                      hideHeader={true}
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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}

export default PhotoCarousel
