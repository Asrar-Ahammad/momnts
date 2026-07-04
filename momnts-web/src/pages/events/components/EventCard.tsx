import * as React from 'react'
import { useNavigate } from 'react-router'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { EventData } from '../../../features/events/services/events.api'
import { Button } from "../../../components/ui/button"
import { CalendarDots, MapPin, ArrowRight, Crown, User, Image as ImageIcon, Lock } from '@phosphor-icons/react'
import { cn } from '../../../lib/utils'
import { photosApi } from '../../../features/events/services/photos.api'
import { useWebHaptics } from 'web-haptics/react'

interface EventCardProps {
  event: EventData
  index?: number
}

const gradientThemes = [
  { bg: 'from-blue-600 via-indigo-500 to-violet-500' },
  { bg: 'from-rose-500 via-pink-500 to-orange-500' },
  { bg: 'from-emerald-500 via-teal-500 to-cyan-500' },
  { bg: 'from-amber-500 via-orange-500 to-rose-500' },
  { bg: 'from-slate-800 via-slate-700 to-slate-600' },
]

const getThemeForEvent = (eventId: string) => {
  let hash = 0
  for (let i = 0; i < eventId.length; i++) {
    hash = eventId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return gradientThemes[Math.abs(hash) % gradientThemes.length]
}

const coverPhotoCache = new Map<string, string>();

export const EventCard = ({ event, index = 0 }: EventCardProps) => {
  const navigate = useNavigate()
  const theme = getThemeForEvent(event.id)
  const isOrganizer = event.user_role === 'ORGANIZER'
  const haptic = useWebHaptics()

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      navigate(`/events/${event.id}`)
    }
  }

  const initialCover = (event as any).cover_url || (event as any).photos?.[0]?.thumb_url || (event as any).photos?.[0]?.url || (event as any).cover_image;
  const [coverPhoto, setCoverPhoto] = React.useState<string | null>(coverPhotoCache.get(event.id) || initialCover || null);

  React.useEffect(() => {
    let mounted = true;
    if (event.encryption_mode === 'E2EE') {
      return;
    }

    // The API already resolves the correct cover photo via resolveAndPresignEvent.
    // Always sync the latest URL from the API so that cover photo changes are
    // reflected immediately after the query is invalidated and re-fetched.
    if (initialCover) {
      setCoverPhoto(initialCover);
      coverPhotoCache.set(event.id, initialCover);
      return;
    }

    // Fallback: no photos were embedded in the event list response.
    // Only perform the extra fetch if we don't already have something cached.
    const cached = coverPhotoCache.get(event.id);
    if (cached) {
      setCoverPhoto(cached);
      return;
    }

    photosApi.getEventPhotos(event.id)
      .then(photos => {
        if (!mounted) return;
        if (photos && photos.length > 0) {
          const photo = photos.find(p => p.is_visible) || photos[0];
          const url = photo.thumb_url || photo.display_url || photo.original_url;

          // Preload image
          const img = new Image();
          img.src = url;

          setCoverPhoto(url);
          coverPhotoCache.set(event.id, url);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch photos for event", event.id, err);
      });
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id, initialCover, event.encryption_mode]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.42, delay: index * 0.055, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -5 }}
      onClick={() => { haptic.trigger("light"); navigate(`/events/${event.id}`) }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View details for event: ${event.name}`}
      className={cn(
        "group cursor-pointer w-full relative rounded-2xl sm:rounded-[26px] overflow-hidden",
        "aspect-square sm:aspect-video",
        "transition-shadow duration-500",
        "hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)] dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.7)]",
        "focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-background"
      )}
    >
      {/* ── Background: photo or animated gradient ────────── */}
      <div className="absolute inset-0 z-0">
        {coverPhoto && event.encryption_mode !== 'E2EE' ? (
          <img
            src={coverPhoto}
            alt={event.name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07]"
          />
        ) : (
          <div className={cn("absolute inset-0 bg-gradient-to-br", event.encryption_mode === 'E2EE' ? 'from-purple-700 via-indigo-700 to-violet-800' : theme.bg)}>
            {/* Organic Animated Waves for gradient fallback */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <motion.div
                animate={{ x: [-20, 20], y: [-10, 10], rotate: [0, 5, 0] }}
                transition={{ duration: 8, repeat: Infinity, repeatType: 'reverse' }}
                className="absolute top-20 -left-20 w-[140%] h-[120%] bg-white/10 rounded-[45%] blur-3xl"
              />
              <motion.div
                animate={{ x: [20, -20], y: [10, -10], rotate: [0, -5, 0] }}
                transition={{ duration: 10, repeat: Infinity, repeatType: 'reverse', delay: 1 }}
                className="absolute top-10 -right-20 w-[120%] h-[100%] bg-white/5 rounded-[40%] blur-3xl"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Deep gradient overlay — natural, no visible box ── */}
      <div className="ev-card-gradient absolute inset-0 z-10 pointer-events-none" />

      {/* ── Top badges — glass chips ───────────────────────── */}
      <div className="absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 flex justify-between items-center z-20">
        <div className="ev-chip flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full text-white text-[8px] sm:text-[10px] font-semibold uppercase tracking-widest">
          {isOrganizer
            ? <Crown weight="fill" size={10} className="text-amber-300 sm:text-xs" />
            : <User weight="bold" size={10} />
          }
          {isOrganizer ? 'Organizer' : 'Attendee'}
        </div>

        <div className={cn(
          "ev-chip flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full text-[8px] sm:text-[10px] font-semibold uppercase tracking-widest",
          event.is_active ? "text-emerald-200" : "text-red-200"
        )}>
          <span className={cn(
            "h-1.5 w-1.5 rounded-full shrink-0",
            event.is_active ? "bg-emerald-400 animate-pulse" : "bg-red-400"
          )} />
          {event.is_active ? 'Live' : 'Closed'}
        </div>
      </div>

      {/* ── Bottom content — floating text over gradient ────── */}
      <div className="absolute bottom-0 inset-x-0 z-20 p-3.5 sm:p-5">
        {/* Event name */}
        <h2 className="text-sm sm:text-lg font-bold text-white tracking-tight leading-snug capitalize line-clamp-1 mb-1.5 sm:mb-2 flex items-center gap-1.5">
          <span className="truncate drop-shadow-sm">{event.name}</span>
          {event.encryption_mode === 'E2EE' && (
            <span className="ev-chip inline-flex items-center justify-center rounded-full p-1 shrink-0">
              <Lock size={9} weight="fill" className="text-white" />
            </span>
          )}
        </h2>

        {/* Location + date */}
        <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-4 overflow-hidden">
          <div className="flex items-center gap-1 text-white/60 text-[10px] sm:text-xs font-medium min-w-0 shrink">
            <MapPin size={10} weight="bold" className="text-white/40 shrink-0" />
            <span className="capitalize truncate">{event.location}</span>
          </div>
          <div className="flex items-center gap-1 text-white/60 text-[10px] sm:text-xs font-medium shrink-0">
            <CalendarDots size={10} weight="bold" className="text-white/40 shrink-0" />
            <span>{format(new Date(event.date), 'MMM dd, yyyy')}</span>
          </div>
        </div>

        {/* Footer: avatars + gallery CTA */}
        <div className="flex items-center justify-between">
          {/* Stacked avatars */}
          <div className="flex -space-x-1.5 sm:-space-x-2">
            {event.event_access?.slice(0, 3).map((access) => (
              <div key={access.user.id} className="w-5 h-5 sm:w-7 sm:h-7 rounded-full border border-white/20 bg-neutral-900 flex items-center justify-center overflow-hidden shrink-0">
                {access.user.selfie_url ? (
                  <img
                    src={access.user.selfie_url}
                    alt={access.user.name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={9} weight="bold" className="text-white/40" />
                )}
              </div>
            ))}
            {(event._count?.event_access || event.event_access?.length || 0) > 3 && (
              <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full border border-white/20 bg-neutral-900 flex items-center justify-center text-[7px] sm:text-[9px] font-semibold text-white/50 shrink-0">
                +{(event._count?.event_access || event.event_access?.length || 0) - Math.min(3, event.event_access?.length || 0)}
              </div>
            )}
          </div>

          {/* Gallery CTA — glass pill (hidden on smallest screens) */}
          <div className="ev-gallery-btn hidden sm:flex items-center gap-1.5 rounded-full px-3.5 py-1.5 cursor-pointer">
            <span className="text-white text-xs font-semibold">Gallery</span>
            <ArrowRight size={12} weight="bold" className="text-white group-hover:translate-x-0.5 transition-transform duration-300" />
          </div>
        </div>
      </div>
    </motion.div>
  )
}