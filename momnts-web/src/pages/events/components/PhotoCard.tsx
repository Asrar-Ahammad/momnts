import { useState, useEffect, useRef } from 'react'
import { Check, Trash, Warning, Users, Heart } from '@phosphor-icons/react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../../components/ui/alert-dialog"
import { PhotoData } from '../../../features/events/services/photos.api'
import { cn } from '../../../lib/utils'

interface PhotoCardProps {
  photo: PhotoData
  onClick: () => void
  isSelectMode?: boolean
  isSelected?: boolean
  canDelete?: boolean
  onDelete?: () => void
  isFavourite?: boolean
  onToggleFavourite?: () => void
}

const PhotoCard = ({
  photo,
  onClick,
  isSelectMode,
  isSelected,
  canDelete,
  onDelete,
  isFavourite,
  onToggleFavourite
}: PhotoCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative group overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800 transition-all duration-200",
        isSelectMode ? "ring-2" : "",
        isSelected ? "ring-neutral-900 dark:ring-white scale-[0.98]" : "ring-transparent",
        !isSelectMode && "cursor-pointer"
      )}
      onClick={onClick}
    >
      {isSelectMode && (
        <div className={cn(
          "absolute top-3 right-3 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200",
          isSelected
            ? "bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white"
            : "bg-black/20 border-white/50 backdrop-blur-sm"
        )}>
          {isSelected && <Check size={14} weight="bold" className="text-white dark:text-neutral-900" />}
        </div>
      )}

      {/* Desktop Favourite Button (Top Left) */}
      {!isSelectMode && (
        <div
          className={cn(
            "absolute top-3 left-3 z-20 hidden sm:block transition-all duration-200",
            isFavourite ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavourite?.()
          }}
        >
          <button
            type="button"
            className={cn(
              "p-2 rounded-full backdrop-blur-sm transition-all duration-200 cursor-pointer shadow-md flex items-center justify-center",
              isFavourite
                ? "bg-rose-500 text-white hover:bg-rose-600 scale-105"
                : "bg-black/40 text-white/80 hover:bg-black/60 hover:scale-105 border border-white/10"
            )}
          >
            <Heart size={14} weight={isFavourite ? "fill" : "bold"} />
          </button>
        </div>
      )}

      {/* Mobile Favourite Button (Top Right) */}
      {!isSelectMode && (
        <div
          className={cn(
            "absolute top-3 right-3 z-20 block sm:hidden transition-all duration-200"
          )}
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavourite?.()
          }}
        >
          <button
            type="button"
            className={cn(
              "p-2 rounded-full backdrop-blur-sm transition-all duration-200 cursor-pointer shadow-md flex items-center justify-center",
              isFavourite
                ? "bg-rose-500 text-white scale-105"
                : "bg-black/40 text-white/80 border border-white/10"
            )}
          >
            <Heart size={14} weight={isFavourite ? "fill" : "bold"} />
          </button>
        </div>
      )}

      <img
        src={isInView ? photo.thumb_url : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'}
        alt="Event photo"
        className="w-full h-auto transition-opacity duration-300"
        style={{ display: imageLoaded ? 'block' : 'none' }}
        onLoad={() => setImageLoaded(true)}
      />

      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center min-h-[200px]">
          <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Face Count Badge (Persistent on Mobile) */}
      {photo._count?.photo_faces > 0 && (
        <div className="absolute bottom-2 right-2 z-10 px-2 py-1 bg-black/40 backdrop-blur-md rounded-lg flex items-center gap-1.5 border border-white/10 shadow-sm sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <Users size={12} weight="bold" className="text-white" />
          <span className="text-[10px] font-bold text-white leading-none">{photo._count.photo_faces}</span>
        </div>
      )}

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">

        {/* Delete Button (Top Right) */}
        {canDelete && !isSelectMode && (
          <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  className="p-2 rounded-full bg-black/50 text-white/80 hover:bg-red-500 hover:text-white backdrop-blur-sm transition-colors cursor-pointer"
                >
                  <Trash size={16} />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                    <Warning size={24} weight="fill" />
                    Delete Photo
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this photo? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete?.()}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-3 pr-12">
          <p className="text-white text-sm font-medium truncate capitalize">
            {photo.user?.name || 'Unknown'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default PhotoCard
