import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Dialog, DialogContent, DialogClose } from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { X, CaretLeft, CaretRight, XIcon, Trash } from '@phosphor-icons/react'
import { PhotoData } from '../../../features/events/services/photos.api'
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

interface PhotoCarouselProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  photos: PhotoData[]
  initialIndex: number
  onDelete?: (photoId: string) => void
  currentUserId?: string
  userRole?: string
  isEventActive?: boolean
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

const PhotoCarousel = ({ open, onOpenChange, photos, initialIndex, onDelete, currentUserId, userRole, isEventActive }: PhotoCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isLoading, setIsLoading] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const preloadedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [initialIndex])

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
      requestIdleCallback?.(() => {
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
    setCurrentIndex(initialIndex)
    setNaturalSize(null) // Reset natural size when image changes
  }, [initialIndex])

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
    if (photos.length === 0 || !currentPhoto) return { width: 0, height: 0 }

    const viewportW = windowSize.width * 0.95
    const viewportH = windowSize.height * 0.95

    const naturalW = currentPhoto.width || naturalSize?.width
    const naturalH = currentPhoto.height || naturalSize?.height

    if (!naturalW || !naturalH) {
      // Unknown dimensions — use a safe medium size while loading
      return { width: Math.min(viewportW, 600), height: Math.min(viewportH, 450) }
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

    return { width: targetW, height: targetH }
  }, [photos.length, currentPhoto, naturalSize, windowSize])

  const canDelete = userRole === 'ORGANIZER' || (isEventActive && currentUserId === currentPhoto?.user_id)

  const handleDelete = () => {
    onDelete?.(currentPhoto.id)
    setDeleteConfirmOpen(false)
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-none p-0 bg-black border-0 overflow-hidden transition-[width,height] duration-300 ease-out shadow-2xl gap-0 data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 duration-300"
          style={{ width: dialogStyle.width, height: dialogStyle.height }}
          showCloseButton={false}
        >
          {currentPhoto && (
            <div className="relative flex items-center justify-center w-full h-full">
              {/* Header / Action Buttons */}
              <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
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
                    <XIcon size={20} weight="bold" />
                  </Button>
                </DialogClose>
              </div>

              {/* Navigation Controls */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 z-40 pointer-events-none">
                <Button
                  variant="ghost"
                  size="icon"
                  className="pointer-events-auto hover:text-white cursor-pointer h-8 w-8 md:h-12 md:w-12 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                  onClick={goToPrevious}
                >
                  <CaretLeft size={28} weight="bold" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="pointer-events-auto hover:text-white cursor-pointer h-8 w-8 md:h-12 md:w-12  bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                  onClick={goToNext}
                >
                  <CaretRight size={28} weight="bold" />
                </Button>
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
    </>
  )
}

export default PhotoCarousel
