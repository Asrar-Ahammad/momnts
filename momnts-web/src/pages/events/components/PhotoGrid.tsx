import { Images } from '@phosphor-icons/react'
import { PhotoData } from '../../../features/events/services/photos.api'
import { Skeleton } from '../../../components/ui/skeleton'
import PhotoCard from './PhotoCard'
import { motion, AnimatePresence } from 'framer-motion'

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
}

const SKELETON_HEIGHTS = [240, 320, 200, 280, 360, 220, 300, 260, 340, 180, 290, 250]

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
  userRole
}: PhotoGridProps) => {
  const getPhotoIndex = (photoId: string) => {
    return photos.findIndex((photo) => photo.id === photoId)
  }

  if (loading) {
    return (
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
        {SKELETON_HEIGHTS.map((height, i) => (
          <div key={i} className="mb-4 break-inside-avoid">
            <Skeleton
              className="w-full rounded-xl bg-gray-300"
              style={{ height: `${height}px` }}
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
              : "No photos matched with your face yet."}
        </p>
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4"
      >
        {photos.map((photo, index) => (
          <motion.div 
            key={photo.id} 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="mb-4 break-inside-avoid"
          >
            <PhotoCard
              photo={photo}
              onClick={() => onPhotoClick(getPhotoIndex(photo.id))}
              onDelete={() => onDelete(photo.id)}
              canDelete={userRole === 'ORGANIZER' || (event?.is_active && currentUserId === photo.user_id)}
              isSelectMode={isSelectMode}
              isSelected={selectedPhotoIds.has(photo.id)}
            />
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  )
}

export default PhotoGrid
