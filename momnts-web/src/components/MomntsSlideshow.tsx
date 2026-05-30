import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  MusicNotes,
  CalendarBlank,
  MapPin
} from '@phosphor-icons/react'
import { photosApi, PhotoData } from '../features/events/services/photos.api'
import { cn } from '../lib/utils'
import { SlideshowIntro } from './SlideshowIntro'
import { SlideshowThumbnails } from './SlideshowThumbnails'
import { SlideshowControls } from './SlideshowControls'

// Dynamically resolve all music tracks in the assets/music folder
const musicModules = import.meta.glob('../assets/music/*.{mp3,wav,ogg,m4a,aac}', { eager: true })

const musicTracks = Object.entries(musicModules).map(([path, mod]) => {
  const filename = path.split('/').pop() || ''
  const name = filename.replace(/\.[^/.]+$/, "") // Remove file extension
  return {
    id: filename,
    name: name,
    url: (mod as any).default || mod
  }
})

interface MomntsSlideshowProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  eventName: string
  eventLocation: string
  eventDate: string
}

export const MomntsSlideshow = ({
  open,
  onOpenChange,
  eventId,
  eventName,
  eventLocation,
  eventDate
}: MomntsSlideshowProps) => {
  const [photos, setPhotos] = useState<PhotoData[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)

  // Slideshow States
  const [isSlideshowPlaying, setIsSlideshowPlaying] = useState(true)
  const [speed, setSpeed] = useState(4000) // Default 4 seconds
  const [showIntro, setShowIntro] = useState(true)
  const [showControls, setShowControls] = useState(true)
  const [showThumbnails, setShowThumbnails] = useState(false)
  const [thumbnailPage, setThumbnailPage] = useState(0)

  // Music States
  const [currentTrack, setCurrentTrack] = useState<string>(
    musicTracks.length > 0 ? musicTracks[0].id : ''
  )
  const [volume, setVolume] = useState(0.4)
  const [isMuted, setIsMuted] = useState(false)

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const controlsTimeoutRef = useRef<number | null>(null)
  const slideshowIntervalRef = useRef<number | null>(null)

  // Initialize and load photos
  useEffect(() => {
    if (!open || !eventId) return

    const fetchPhotos = async () => {
      try {
        setLoading(true)
        const data = await photosApi.getEventPhotos(eventId)
        // Filter out processed photos if any, or just display all processed ones
        const processedPhotos = data.filter((p) => p.processed && p.is_visible)
        const activePhotos = processedPhotos.length > 0 ? processedPhotos : data
        setPhotos(activePhotos)
        setCurrentIndex(0)
        setShowIntro(true)

        // Preload first 3 photos immediately in background
        if (activePhotos.length > 0) {
          activePhotos.slice(0, 3).forEach((photo) => {
            const img = new Image()
            img.src = photo.display_url
          })
        }
      } catch (error) {
        console.error('Failed to load photos for slideshow:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPhotos()
  }, [open, eventId])

  // Preload next/prev photos dynamically to avoid black screens
  useEffect(() => {
    if (photos.length === 0) return

    // Preload next photo
    const nextIndex = (currentIndex + 1) % photos.length
    const nextPhoto = photos[nextIndex]
    if (nextPhoto) {
      const img = new Image()
      img.src = nextPhoto.display_url
    }

    // Preload previous photo (just in case they navigate backwards)
    const prevIndex = (currentIndex - 1 + photos.length) % photos.length
    const prevPhoto = photos[prevIndex]
    if (prevPhoto) {
      const img = new Image()
      img.src = prevPhoto.display_url
    }
  }, [currentIndex, photos])

  // Toggle slideshow-active class on body and dispatch custom event for hiding mobile nav
  useEffect(() => {
    if (open) {
      document.body.classList.add('slideshow-active')
      window.dispatchEvent(new CustomEvent('slideshow-state-change', { detail: { open: true } }))
    } else {
      document.body.classList.remove('slideshow-active')
      window.dispatchEvent(new CustomEvent('slideshow-state-change', { detail: { open: false } }))
    }
    return () => {
      document.body.classList.remove('slideshow-active')
      window.dispatchEvent(new CustomEvent('slideshow-state-change', { detail: { open: false } }))
    }
  }, [open])

  // Audio setup and sync
  useEffect(() => {
    if (!open) {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      return
    }

    // Create audio element if not exists
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.loop = true
    }

    // Set audio track URL
    const activeTrack = musicTracks.find((t) => t.id === currentTrack) || musicTracks[0]
    const trackUrl = activeTrack ? activeTrack.url : ''
    if (trackUrl && audioRef.current.src !== window.location.origin + trackUrl && !audioRef.current.src.endsWith(trackUrl)) {
      audioRef.current.src = trackUrl
      audioRef.current.load()
    }

    // Sync volume & mute state safely
    const safeVolume = typeof volume === 'number' && isFinite(volume) ? volume : 0.4
    audioRef.current.volume = isMuted ? 0 : safeVolume

    // Play or Pause audio
    if (isSlideshowPlaying && !showIntro) {
      audioRef.current.play().catch((err) => {
        console.warn('Autoplay prevented or failed:', err)
        setIsSlideshowPlaying(false)
      })
    } else {
      audioRef.current.pause()
    }

    return () => {
      if (!open && audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [open, isSlideshowPlaying, currentTrack, volume, isMuted, showIntro])

  // Manage slideshow timer interval
  const goToNext = useCallback(() => {
    if (photos.length === 0) return
    setCurrentIndex((prevIndex) => (prevIndex + 1) % photos.length)
  }, [photos.length])

  const goToPrevious = useCallback(() => {
    if (photos.length === 0) return
    setCurrentIndex((prevIndex) => (prevIndex - 1 + photos.length) % photos.length)
  }, [photos.length])

  useEffect(() => {
    if (slideshowIntervalRef.current) {
      window.clearInterval(slideshowIntervalRef.current)
    }

    if (isSlideshowPlaying && !showIntro && photos.length > 1) {
      slideshowIntervalRef.current = window.setInterval(() => {
        goToNext()
      }, speed)
    }

    return () => {
      if (slideshowIntervalRef.current) {
        window.clearInterval(slideshowIntervalRef.current)
      }
    }
  }, [isSlideshowPlaying, speed, showIntro, photos.length, goToNext])

  // Handle User Idle / Hide Controls Overlay
  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isSlideshowPlaying && !showIntro) {
        setShowControls(false)
      }
    }, 4000)
  }, [isSlideshowPlaying, showIntro])

  useEffect(() => {
    if (!open || showIntro) return

    const handleMouseMove = () => resetControlsTimer()
    window.addEventListener('mousemove', handleMouseMove)

    resetControlsTimer()

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [open, showIntro, resetControlsTimer])

  // Handle Keyboard Shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (showIntro) return

    switch (e.key) {
      case 'ArrowLeft':
        goToPrevious()
        resetControlsTimer()
        break
      case 'ArrowRight':
        goToNext()
        resetControlsTimer()
        break
      case ' ':
        e.preventDefault()
        setIsSlideshowPlaying((prev) => !prev)
        resetControlsTimer()
        break
      case 'm':
      case 'M':
        setIsMuted((prev) => !prev)
        resetControlsTimer()
        break
      case 'Escape':
        onOpenChange(false)
        break
    }
  }, [showIntro, goToNext, goToPrevious, resetControlsTimer, onOpenChange])

  useEffect(() => {
    if (open) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleKeyDown])

  // Keep thumbnail page in sync with active currentIndex (5 items per page)
  useEffect(() => {
    const activePage = Math.floor(currentIndex / 5)
    setThumbnailPage(activePage)
  }, [currentIndex])

  // Start Slideshow & Audio upon clicking the Intro panel
  const handleStart = () => {
    setShowIntro(false)
    setIsSlideshowPlaying(true)
  }

  // Handle Close & cleanup
  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    setShowThumbnails(false)
    setThumbnailPage(0)
    onOpenChange(false)
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <div className={cn(
        "fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between text-white overflow-hidden select-none transition-all duration-300",
        (!showControls && !showIntro) ? "cursor-none" : ""
      )}>

        {/* Particle Overlay Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,rgba(0,0,0,0.96)_100%)] pointer-events-none z-0" />
        <div className="absolute inset-0 opacity-10 pointer-events-none z-0 overflow-hidden">
          <div className="absolute w-[500px] h-[500px] bg-white/5 rounded-full blur-[120px] -top-48 -left-48 animate-pulse" />
          <div className="absolute w-[600px] h-[600px] bg-white/5 rounded-full blur-[140px] -bottom-48 -right-48 animate-pulse delay-2000" />
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-50 gap-4">
            <div className="relative">
              <div className="w-14 h-14 border-4 border-white/10 border-t-white rounded-full animate-spin" />
              <div className="w-8 h-8 border-4 border-white/10 border-b-white rounded-full animate-spin absolute top-3 left-3 animate-reverse" />
            </div>
            <p className="text-sm font-medium text-neutral-300 tracking-wider animate-pulse">
              Curating your memory lane...
            </p>
          </div>
        )}

        {/* INTRO SCREEN - Safe gesture activator for HTML5 Autoplay */}
        {!loading && showIntro && (
          <SlideshowIntro
            eventName={eventName}
            eventLocation={eventLocation}
            eventDate={eventDate}
            photos={photos}
            handleClose={handleClose}
            handleStart={handleStart}
          />
        )}

        {/* MAIN SLIDESHOW */}
        {!loading && !showIntro && photos.length > 0 && (
          <>
            {/* Top Bar - Automatically Hides */}
            <motion.div
              animate={{ y: showControls ? 0 : -100, opacity: showControls ? 1 : 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 28 }}
              className={cn(
                "absolute top-0 inset-x-0 z-40 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-6 flex justify-between items-start",
                showControls ? "pointer-events-auto" : "pointer-events-none"
              )}
            >
              <div className="space-y-1">
                <h3 className="text-xl font-sirage font-bold tracking-tight capitalize">
                  {eventName}
                </h3>
                <p className="text-xs text-neutral-400 flex items-center gap-3">
                  {eventLocation && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} className="text-white" />
                      <span className='capitalize'>{eventLocation}</span>
                    </span>
                  )}
                  {eventDate && (
                    <span className="flex items-center gap-1">
                      <CalendarBlank size={12} className="text-white" />
                      {new Date(eventDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                </p>
              </div>

              {/* Close Slide button */}
              <button
                onClick={handleClose}
                className="p-3 bg-black/40 hover:bg-white/10 hover:text-white text-white border border-white/10 rounded-full transition-all duration-300 ease-in-out group cursor-pointer"
                aria-label="Exit Slideshow"
              >
                <X size={20} className="group-hover:text-white text-white/40 transition-all duration-300 ease-in-out" />
              </button>
            </motion.div>

            {/* Immersive Photo Display Panel */}
            <div className="relative w-full h-full flex items-center justify-center z-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: 'easeInOut' }}
                  className="absolute inset-0 flex items-center justify-center p-4"
                >
                  {/* Subtle Blurred Background Glow */}
                  <img
                    src={photos[currentIndex]?.display_url}
                    alt="bg blur"
                    className="absolute inset-0 w-full h-full object-cover blur-[100px] opacity-35 scale-110 pointer-events-none select-none"
                  />

                  {/* Cinematic Ken Burns Effect Image */}
                  <motion.div
                    initial={{ scale: 1 }}
                    animate={{ scale: 1.08 }}
                    transition={{
                      duration: speed / 1000 + 0.5,
                      ease: 'linear'
                    }}
                    className="relative max-w-full max-h-[85vh] md:max-h-[80vh] flex items-center justify-center"
                  >
                    <img
                      src={photos[currentIndex]?.display_url}
                      alt={`Photo ${currentIndex + 1}`}
                      className="max-w-full max-h-[80vh] md:max-h-[75vh] object-contain rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10"
                    />

                    {/* Photo Uploader Tag */}
                    {photos[currentIndex]?.user?.name && (
                      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[10px] text-neutral-300 font-semibold tracking-wide capitalize">
                        Captured by {photos[currentIndex].user.name}
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              </AnimatePresence>

            </div>

            {/* Bottom Panel (HUD Controls + Thumbnail Strip) */}
            <SlideshowControls
              showControls={showControls}
              showThumbnails={showThumbnails}
              setShowThumbnails={setShowThumbnails}
              currentIndex={currentIndex}
              photos={photos}
              isSlideshowPlaying={isSlideshowPlaying}
              setIsSlideshowPlaying={setIsSlideshowPlaying}
              speed={speed}
              setSpeed={setSpeed}
              currentTrack={currentTrack}
              setCurrentTrack={setCurrentTrack}
              musicTracks={musicTracks}
              isMuted={isMuted}
              setIsMuted={setIsMuted}
              volume={volume}
              setVolume={setVolume}
              resetControlsTimer={resetControlsTimer}
            >
              {showThumbnails && (
                <SlideshowThumbnails
                  photos={photos}
                  thumbnailPage={thumbnailPage}
                  setThumbnailPage={setThumbnailPage}
                  currentIndex={currentIndex}
                  setCurrentIndex={setCurrentIndex}
                  setIsSlideshowPlaying={setIsSlideshowPlaying}
                  resetControlsTimer={resetControlsTimer}
                />
              )}
            </SlideshowControls>
          </>
        )}
      </div>
    </AnimatePresence>
  )
}
