import { useState } from 'react'
import { Check, Trash, Warning } from '@phosphor-icons/react'
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
}

const PhotoCard = ({ photo, onClick, isSelectMode, isSelected, canDelete, onDelete }: PhotoCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false)

  return (
    <div
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
      <img
        src={photo.thumb_url}
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

        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white text-sm font-medium truncate capitalize">
            {photo.user?.name || 'Unknown'}
          </p>
          {photo._count?.photo_faces > 0 && (
            <p className="text-white/70 text-xs">
              {photo._count.photo_faces} face{photo._count.photo_faces > 1 ? 's' : ''} detected
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default PhotoCard
