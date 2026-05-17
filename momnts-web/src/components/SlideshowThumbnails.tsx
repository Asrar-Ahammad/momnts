import React from 'react'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { PhotoData } from '../features/events/services/photos.api'
import { cn } from '../lib/utils'

interface SlideshowThumbnailsProps {
  photos: PhotoData[]
  thumbnailPage: number
  setThumbnailPage: React.Dispatch<React.SetStateAction<number>>
  currentIndex: number
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>
  setIsSlideshowPlaying: React.Dispatch<React.SetStateAction<boolean>>
  resetControlsTimer: () => void
}

export const SlideshowThumbnails = ({
  photos,
  thumbnailPage,
  setThumbnailPage,
  currentIndex,
  setCurrentIndex,
  setIsSlideshowPlaying,
  resetControlsTimer,
}: SlideshowThumbnailsProps) => {
  const ITEMS_PER_PAGE = 5
  const totalPages = Math.ceil(photos.length / ITEMS_PER_PAGE)
  const startIndex = thumbnailPage * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedPhotos = photos.slice(startIndex, endIndex)

  return (
    <div className="flex items-center justify-center gap-3 w-full">
      {/* Prev Page Button */}
      <button
        disabled={thumbnailPage === 0}
        onClick={() => {
          setThumbnailPage((prev) => Math.max(0, prev - 1))
          resetControlsTimer()
        }}
        className="p-1.5 bg-white/5 disabled:opacity-30 disabled:hover:bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all cursor-pointer text-white disabled:cursor-not-allowed shrink-0"
        title="Previous Page"
      >
        <CaretLeft size={14} weight="bold" />
      </button>

      {/* Thumbnail Items Page */}
      <div className="flex gap-2.5 items-center justify-center py-1">
        {paginatedPhotos.map((photo) => {
          const actualIndex = photos.indexOf(photo)
          return (
            <button
              key={photo.id}
              onClick={() => {
                setCurrentIndex(actualIndex)
                setIsSlideshowPlaying(false)
                resetControlsTimer()
              }}
              className={cn(
                "relative flex-shrink-0 w-10 h-10 md:w-14 md:h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer",
                currentIndex === actualIndex
                  ? "border-white scale-110 shadow-lg shadow-white/10"
                  : "border-white/10 hover:border-white/30 opacity-60 hover:opacity-100"
              )}
            >
              <img
                src={photo.thumb_url || photo.display_url}
                alt={`Thumb ${actualIndex + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          )
        })}
      </div>

      {/* Next Page Button */}
      <button
        disabled={thumbnailPage >= totalPages - 1}
        onClick={() => {
          setThumbnailPage((prev) => Math.min(totalPages - 1, prev + 1))
          resetControlsTimer()
        }}
        className="p-1.5 bg-white/5 disabled:opacity-30 disabled:hover:bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all cursor-pointer text-white disabled:cursor-not-allowed shrink-0"
        title="Next Page"
      >
        <CaretRight size={14} weight="bold" />
      </button>
    </div>
  )
}
