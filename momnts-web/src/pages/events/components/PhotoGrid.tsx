import { useState, useEffect, useRef, useCallback } from 'react'
import { Images, CircleNotch } from '@phosphor-icons/react'
import { PhotoData } from '../../../features/events/services/photos.api'
import { Skeleton } from '../../../components/ui/skeleton'
import PhotoCard from './PhotoCard'
import { motion, AnimatePresence } from 'framer-motion'

type GalleryColumns = 1 | 2 | 3

interface PhotoGridProps {
  photos: PhotoData[]
  loading: boolean
  activeTab: string
  event: { user_id?: string } | null
  onPhotoClick: (index: number) => void
  onDelete: (photoId: string) => void
  isSelectMode: boolean
  selectedPhotoIds: Set<string>
  onToggleSelect: (photoId: string) => void
  currentUserId?: string
  userRole?: string
  favouritePhotoIds: Set<string>
  onToggleFavourite: (photoId: string) => void
  galleryColumns?: GalleryColumns
}

const SKELETON_HEIGHTS = [240, 320, 200, 280, 360, 220, 300, 260, 340, 180, 290, 250]

const MOBILE_COLUMN_CLASSES: Record<GalleryColumns, string> = {
  1: 'columns-1',
  2: 'columns-2',
  3: 'columns-3',
}

const useColumnCount = (galleryColumns: GalleryColumns) => {
  const [cols, setCols] = useState(galleryColumns)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => {
      const width = window.innerWidth
      if (width >= 1280) {
        setCols(Math.max(4, galleryColumns))
      } else if (width >= 1024) {
        setCols(Math.max(3, galleryColumns))
      } else if (width >= 640) {
        setCols(Math.max(2, galleryColumns))
      } else {
        setCols(galleryColumns)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [galleryColumns])

  return cols
}

const PhotoGrid = ({
  photos,
  loading,
  activeTab,
  event,
  onPhotoClick,
  onDelete,
  isSelectMode,
  selectedPhotoIds,
  onToggleSelect,
  currentUserId,
  userRole,
  favouritePhotoIds,
  onToggleFavourite,
  galleryColumns = 1
}: PhotoGridProps) => {
  const [visibleCount, setVisibleCount] = useState(10)
  const [isPageLoading, setIsPageLoading] = useState(false)
  const cols = useColumnCount(galleryColumns)

  const visibleCountRef = useRef(visibleCount)
  const photosLengthRef = useRef(photos.length)
  const isPageLoadingRef = useRef(isPageLoading)
  const observerInstanceRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    visibleCountRef.current = visibleCount
    photosLengthRef.current = photos.length
    isPageLoadingRef.current = isPageLoading
  })

  const firstPhotoId = photos[0]?.id

  useEffect(() => {
    setVisibleCount(10)
    setIsPageLoading(false)
  }, [activeTab, event?.user_id, firstPhotoId])


  useEffect(() => {
    return () => {
      if (observerInstanceRef.current) {
        observerInstanceRef.current.disconnect()
      }
    }
  }, [])

  // Callback Ref for IntersectionObserver
  const observerRef = useCallback((node: HTMLDivElement | null) => {
    if (observerInstanceRef.current) {
      observerInstanceRef.current.disconnect()
      observerInstanceRef.current = null
    }

    if (node) {
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0]
          if (
            entry.isIntersecting &&
            visibleCountRef.current < photosLengthRef.current &&
            !isPageLoadingRef.current
          ) {
            setIsPageLoading(true)
            setTimeout(() => {
              setVisibleCount((prev) => Math.min(prev + 10, photosLengthRef.current))
              setIsPageLoading(false)
            }, 600)
          }
        },
        { rootMargin: '100px' }
      )
      observer.observe(node)
      observerInstanceRef.current = observer
    }
  }, [])

  const mobileColClass = MOBILE_COLUMN_CLASSES[galleryColumns]
  const getPhotoIndex = (photoId: string) => {
    return photos.findIndex((photo) => photo.id === photoId)
  }

  if (loading) {
    return (
      <div className={`${mobileColClass} sm:columns-2 lg:columns-3 xl:columns-4 gap-3 sm:gap-4 transition-all duration-300`}>
        {SKELETON_HEIGHTS.map((height, i) => (
          <div key={i} className="mb-3 sm:mb-4 break-inside-avoid">
            <Skeleton
              className="w-full rounded-xl bg-gray-300"
              style={{ height: galleryColumns > 1 ? `${Math.round(height * 0.65)}px` : `${height}px` }}
            />
          </div>
        ))}
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <Images size={48} className="mx-auto text-neutral-300 mb-4" />
        <p className="text-neutral-500">
          {activeTab === 'all'
            ? 'No photos yet. Be the first to upload!'
            : activeTab === 'your-uploads'
              ? "You haven't uploaded any photos yet."
              : activeTab === 'favourites'
                ? "No favourites added yet. Tap the heart icon on any photo!"
                : "No photos matched with your face yet."}
        </p>
      </div>
    )
  }

  const visiblePhotos = photos.slice(0, visibleCount)

  // Distribute photos into columns dynamically but stably.
  // Using greedy aspect-ratio height balancing to look clean and Pinterest-like.
  const columnsData = Array.from({ length: cols }, () => [] as PhotoData[])
  const colHeights = Array(cols).fill(0)

  visiblePhotos.forEach((photo) => {
    let minColIdx = 0
    let minHeight = colHeights[0]
    for (let i = 1; i < cols; i++) {
      if (colHeights[i] < minHeight) {
        minHeight = colHeights[i]
        minColIdx = i
      }
    }
    columnsData[minColIdx].push(photo)
    const aspect = photo.height && photo.width ? photo.height / photo.width : 1.3
    colHeights[minColIdx] += aspect
  })

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeTab}-${cols}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="flex flex-row items-start gap-3 sm:gap-4 transition-all duration-300"
        >
          {columnsData.map((colPhotos, colIdx) => (
            <div key={colIdx} className="flex flex-col gap-3 sm:gap-4 flex-1 min-w-0">
              {colPhotos.map((photo) => (
                <motion.div
                  key={photo.id}
                  layout="position"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <PhotoCard
                    photo={photo}
                    onClick={() => onPhotoClick(getPhotoIndex(photo.id))}
                    onDelete={() => onDelete(photo.id)}
                    canDelete={userRole === 'ORGANIZER' || (event?.is_active && currentUserId === photo.user_id)}
                    isSelectMode={isSelectMode}
                    isSelected={selectedPhotoIds.has(photo.id)}
                    isFavourite={favouritePhotoIds.has(photo.id)}
                    onToggleFavourite={() => onToggleFavourite(photo.id)}
                  />
                </motion.div>
              ))}
            </div>
          ))}
        </motion.div>
      </AnimatePresence>

      {visibleCount < photos.length && (
        <div ref={observerRef} className="w-full flex justify-center items-center py-8 mt-4">
          {isPageLoading && (
            <div className="flex flex-col items-center gap-2">
              <CircleNotch size={32} className="animate-spin text-neutral-400 dark:text-neutral-500" />
              <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">Loading more photos...</span>
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default PhotoGrid
