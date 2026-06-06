import * as React from 'react'
import { useNavigate } from 'react-router'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { EventData } from '../../../features/events/services/events.api'
import { Button } from "../../../components/ui/button"
import { CalendarDots, MapPin, ArrowRight, Crown, User, Image as ImageIcon } from '@phosphor-icons/react'
import { cn } from '../../../lib/utils'
import { photosApi } from '../../../features/events/services/photos.api'
import { useWebHaptics } from 'web-haptics/react'

interface EventCardProps {
  event: EventData
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

export const EventCard = ({ event }: EventCardProps) => {
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

  const cachedCover = coverPhotoCache.get(event.id);
  const initialCover = (event as any).cover_url || (event as any).photos?.[0]?.thumb_url || (event as any).photos?.[0]?.url || (event as any).cover_image;
  const [coverPhoto, setCoverPhoto] = React.useState<string | null>(cachedCover || initialCover || null);

  React.useEffect(() => {
    let mounted = true;
    if (coverPhoto) {
      if (!coverPhotoCache.has(event.id)) {
        coverPhotoCache.set(event.id, coverPhoto);
      }
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
  }, [event.id, initialCover, coverPhoto]);
  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={() => { haptic.trigger("light"); navigate(`/events/${event.id}`) }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View details for event: ${event.name}`}
      className="group cursor-pointer w-full relative rounded-[24px] sm:rounded-[32px] overflow-hidden shadow-sm hover:shadow-2xl border border-neutral-100 dark:border-neutral-800 transition-[box-shadow,border-color] duration-300 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500 aspect-square sm:aspect-video"
    >
      {/* Background Section */}
      <div className="absolute inset-0 z-0">
        {coverPhoto ? (
          <img 
            src={coverPhoto} 
            alt={event.name} 
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className={cn("absolute inset-0 bg-gradient-to-br", theme.bg)}>
            {/* Organic Animated Waves for gradient fallback */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <motion.div 
                animate={{ 
                  x: [-20, 20], 
                  y: [-10, 10],
                  rotate: [0, 5, 0]
                }}
                transition={{ duration: 8, repeat: Infinity, repeatType: 'reverse' }}
                className="absolute top-20 -left-20 w-[140%] h-[120%] bg-white/10 rounded-[45%] blur-3xl"
              />
              <motion.div 
                animate={{ 
                  x: [20, -20], 
                  y: [10, -10],
                  rotate: [0, -5, 0]
                }}
                transition={{ duration: 10, repeat: Infinity, repeatType: 'reverse', delay: 1 }}
                className="absolute top-10 -right-20 w-[120%] h-[100%] bg-white/5 rounded-[40%] blur-3xl"
              />
            </div>
          </div>
        )}
      </div>

      {/* Top Status & Role Badges */}
      <div className="absolute top-2.5 sm:top-4 left-2.5 sm:left-4 right-2.5 sm:right-4 flex justify-between items-center z-20">
        <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-black/20 backdrop-blur-md border border-white/20 text-white text-[8px] sm:text-[10px] font-bold uppercase tracking-widest">
          {isOrganizer ? <Crown weight="fill" className="text-amber-300 text-[10px] sm:text-xs" /> : <User weight="bold" />}
          {isOrganizer ? 'Organizer' : 'Attendee'}
        </div>
        
        <div className={cn(
          "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full backdrop-blur-md border text-[8px] sm:text-[10px] font-bold uppercase tracking-widest",
          event.is_active 
            ? "bg-emerald-500/30 border-emerald-500/30 text-emerald-100" 
            : "bg-red-500/30 border-red-500/30 text-red-100"
        )}>
          <span className={cn("h-1 sm:h-1.5 w-1 sm:w-1.5 rounded-full animate-pulse", event.is_active ? "bg-emerald-400" : "bg-red-400")} />
          {event.is_active ? 'Live' : 'Closed'}
        </div>
      </div>

      {/* Gradient Overlay at the bottom */}
      <div className="absolute bottom-0 inset-x-0 h-2/3 z-10 pointer-events-none bg-linear-to-t from-black to-transparent" />

      {/* Bottom Content Area */}
      <div className="absolute bottom-0 inset-x-0 z-20 p-3.5 sm:p-6">
        <div className="mb-2 sm:mb-4 flex flex-col sm:flex-row sm:justify-between items-start sm:items-end gap-1.5 sm:gap-4">
            <h2 className="text-sm sm:text-xl font-black text-white tracking-tight leading-tight capitalize line-clamp-1 sm:line-clamp-2 drop-shadow-lg group-hover:text-white transition-colors flex-1 pb-0.5 w-full sm:w-auto">
              {event.name}
            </h2>
            
            <div className="flex flex-row flex-wrap sm:flex-col items-center sm:items-end gap-1.5 sm:gap-2 shrink-0">
              <div className="flex items-center gap-1 sm:gap-2 text-neutral-200 text-[10px] sm:text-sm font-medium">
                <MapPin size={10} weight="bold" className="text-white shrink-0" />
                <span className="capitalize line-clamp-1">{event.location}</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 text-neutral-200 text-[10px] sm:text-sm font-medium">
                <CalendarDots size={10} weight="bold" className="text-white shrink-0" />
                <span>{format(new Date(event.date), 'MMM dd, yyyy')}</span>
              </div>
            </div>
        </div>

        {/* Footer Metrics & Action */}
        <div className="flex items-center justify-between pt-2.5 sm:pt-4 border-t border-white/20">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5 sm:-space-x-2.5">
              {event.event_access?.slice(0, 3).map((access) => (
                <div key={access.user.id} className="relative">
                  <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-full border border-neutral-900 bg-neutral-800 flex items-center justify-center overflow-hidden shadow-sm">
                    {access.user.selfie_url ? (
                      <img 
                        src={access.user.selfie_url} 
                        alt={access.user.name} 
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
                      />
                    ) : (
                      <div className="bg-neutral-800 w-full h-full flex items-center justify-center">
                        <User size={10} weight="bold" className="text-neutral-400" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {(event._count?.event_access || event.event_access?.length || 0) > 3 && (
                <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-full border border-neutral-900 bg-neutral-800 flex items-center justify-center text-[8px] sm:text-[10px] font-bold text-neutral-400 shadow-sm">
                  +{(event._count?.event_access || event.event_access?.length || 0) - Math.min(3, event.event_access?.length || 0)}
                </div>
              )}
            </div>
          </div>

          <Button 
            className="rounded-full h-8 sm:h-10 px-3 sm:px-5 bg-white text-neutral-900 hover:bg-neutral-200 hover:scale-105 transition-all duration-300 shadow-lg shadow-black/20 group/btn hidden sm:flex"
          >
            <span className="mr-2">Gallery</span>
            <ArrowRight size={14} weight="bold" className="group-hover/btn:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}