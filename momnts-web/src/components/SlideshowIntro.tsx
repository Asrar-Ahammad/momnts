import React from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { MusicNotes, MapPin, CalendarBlank, Images } from '@phosphor-icons/react'
import { PhotoData } from '../features/events/services/photos.api'

interface SlideshowIntroProps {
  eventName: string
  eventLocation: string
  eventDate: string
  photos: PhotoData[]
  handleClose: () => void
  handleStart: () => void
  isLocked?: boolean
  eventId?: string
}

export const SlideshowIntro = ({
  eventName,
  eventLocation,
  eventDate,
  photos,
  handleClose,
  handleStart,
  isLocked = false,
  eventId,
}: SlideshowIntroProps) => {
  const navigate = useNavigate()
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="absolute inset-0 flex items-center justify-center z-50 px-4 bg-black/80 backdrop-blur-3xl"
    >
      <div className="max-w-xl w-full text-center space-y-8 p-8 md:p-12 rounded-[32px] bg-white/[0.03] border border-white/10 backdrop-blur-md shadow-2xl relative overflow-hidden group">
        {/* Card visual elements */}
        <div className="absolute -right-16 -top-16 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />

        <div className="mx-auto w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20 shadow-inner mb-6 relative">
          <MusicNotes size={40} />
          <span className="absolute top-1 right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/60 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/70">
            Relive memory lane
          </p>
          <h2 className="text-4xl md:text-5xl font-sirage font-bold tracking-tight capitalize bg-clip-text text-transparent bg-gradient-to-r from-white via-neutral-100 to-neutral-400">
            {eventName}
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-neutral-400 font-medium pt-2">
            {eventLocation && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full">
                <MapPin size={14} className="text-white" />
                {eventLocation}
              </span>
            )}
            {eventDate && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full">
                <CalendarBlank size={14} className="text-white" />
                {new Date(eventDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
            <span className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full">
              <Images size={14} className="text-white" />
              {photos.length} Photos
            </span>
          </div>
        </div>

        {isLocked ? (
          <p className="text-sm text-amber-400 max-w-sm mx-auto leading-relaxed pt-2 flex items-center justify-center gap-2">
            🔒 This Memory Lane is end-to-end encrypted. You need to unlock the event first to view its photos.
          </p>
        ) : (
          <p className="text-sm text-neutral-400 max-w-sm mx-auto leading-relaxed pt-2">
            Turn up your sound! Enjoy a gorgeous fullscreen slideshow synced to nostalgic ambient vibes.
          </p>
        )}

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
          {photos.length === 0 ? (
            <div className="space-y-4">
              <p className="text-white/80 text-sm">No photos have been uploaded to this event yet.</p>
              <button
                onClick={handleClose}
                className="px-8 py-3.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-sm font-semibold tracking-wide transition-all cursor-pointer"
              >
                Back to Dashboard
              </button>
            </div>
          ) : isLocked ? (
            <>
              <button
                onClick={() => {
                  handleClose()
                  navigate(`/events/${eventId}`)
                }}
                className="w-full sm:w-auto px-10 py-4 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold tracking-wider hover:shadow-xl hover:shadow-purple-500/20 hover:scale-102 active:scale-98 transition-all duration-300 cursor-pointer"
              >
                Unlock Event
              </button>
              <button
                onClick={handleClose}
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-sm font-semibold text-neutral-300 hover:text-white transition-all cursor-pointer"
              >
                Close
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleStart}
                className="w-full sm:w-auto px-10 py-4 rounded-full bg-white hover:bg-neutral-200 text-black text-sm font-bold tracking-wider hover:shadow-xl hover:shadow-white/10 hover:scale-102 active:scale-98 transition-all duration-300 cursor-pointer"
              >
                Enter Memory Lane
              </button>
              <button
                onClick={handleClose}
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-sm font-semibold text-neutral-300 hover:text-white transition-all cursor-pointer"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}
