import * as React from 'react'
import { useNavigate } from 'react-router'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { EventData } from '../../../features/events/services/events.api'
import { Button } from "../../../components/ui/button"
import { CalendarDots, MapPin, ArrowRight, Crown, User, Image as ImageIcon } from '@phosphor-icons/react'
import { cn } from '../../../lib/utils'
import { photosApi } from '../../../features/events/services/photos.api'

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

export const EventCard = ({ event }: EventCardProps) => {
  const navigate = useNavigate()
  const theme = getThemeForEvent(event.id)
  const isOrganizer = event.user_role === 'ORGANIZER'

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      navigate(`/events/${event.id}`)
    }
  }

  const initialCover = (event as any).cover_url || (event as any).photos?.[0]?.url || (event as any).cover_image;
  const [coverPhoto, setCoverPhoto] = React.useState<string | null>(initialCover || null);

  React.useEffect(() => {
    let mounted = true;
    if (!initialCover) {
      photosApi.getEventPhotos(event.id)
        .then(photos => {
          if (!mounted) return;
          if (photos && photos.length > 0) {
            const photo = photos.find(p => p.is_visible) || photos[0];
            setCoverPhoto(photo.display_url || photo.thumb_url || photo.original_url);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch photos for event", event.id, err);
        });
    }
    return () => { mounted = false; };
  }, [event.id, initialCover]);
  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={() => navigate(`/events/${event.id}`)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View details for event: ${event.name}`}
      className="group cursor-pointer w-full relative rounded-[32px] overflow-hidden shadow-sm hover:shadow-2xl border border-neutral-100 dark:border-neutral-800 transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500 aspect-[4/5] sm:aspect-video"
    >
      {/* Background Section */}
      <div className="absolute inset-0 z-0">
        {coverPhoto ? (
          <img 
            src={coverPhoto} 
            alt={event.name} 
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
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/20 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold uppercase tracking-widest">
          {isOrganizer ? <Crown weight="fill" className="text-amber-300" /> : <User weight="bold" />}
          {isOrganizer ? 'Organizer' : 'Attendee'}
        </div>
        
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border text-[10px] font-bold uppercase tracking-widest",
          event.is_active 
            ? "bg-emerald-500/30 border-emerald-500/30 text-emerald-100" 
            : "bg-red-500/30 border-red-500/30 text-red-100"
        )}>
          <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", event.is_active ? "bg-emerald-400" : "bg-red-400")} />
          {event.is_active ? 'Live' : 'Closed'}
        </div>
      </div>

      {/* Gradient Overlay at the bottom */}
      <div className="absolute bottom-0 inset-x-0 h-2/3 z-10 pointer-events-none bg-gradient-to-t from-black to-transparent" />

      {/* Bottom Content Area */}
      <div className="absolute bottom-0 inset-x-0 z-20 p-6">
        <div className="mb-4 flex flex-col sm:flex-row sm:justify-between items-start sm:items-end gap-3 sm:gap-4">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight capitalize line-clamp-2 drop-shadow-lg group-hover:text-white transition-colors flex-1 pb-1 w-full sm:w-auto">
              {event.name}
            </h2>
            
            <div className="flex flex-row flex-wrap sm:flex-col items-center sm:items-end gap-2 shrink-0">
              <div className="flex items-center gap-2 text-neutral-200 text-xs sm:text-sm font-medium">
                <span className="capitalize line-clamp-1">{event.location}</span>
                <div className="p-1 sm:p-1.5 rounded-lg bg-white/10 backdrop-blur-sm hidden sm:block">
                  <MapPin size={14} weight="bold" className="text-white" />
                </div>
                <MapPin size={14} weight="bold" className="text-white sm:hidden order-first" />
              </div>
              <div className="flex items-center gap-2 text-neutral-200 text-xs sm:text-sm font-medium">
                <span>{format(new Date(event.date), 'MMM dd, yyyy')}</span>
                <div className="p-1 sm:p-1.5 rounded-lg bg-white/10 backdrop-blur-sm hidden sm:block">
                  <CalendarDots size={14} weight="bold" className="text-white" />
                </div>
                <CalendarDots size={14} weight="bold" className="text-white sm:hidden order-first" />
              </div>
              {/* Optional: Show photo count if available */}
              {event._count?.photos > 0 && (
                <div className="flex items-center gap-2 text-neutral-200 text-xs sm:text-sm font-medium">
                  <span>{event._count.photos} {event._count.photos === 1 ? 'Photo' : 'Photos'}</span>
                  <div className="p-1 sm:p-1.5 rounded-lg bg-white/10 backdrop-blur-sm hidden sm:block">
                    <ImageIcon size={14} weight="bold" className="text-white" />
                  </div>
                  <ImageIcon size={14} weight="bold" className="text-white sm:hidden order-first" />
                </div>
              )}
            </div>
        </div>

          {/* Footer Metrics & Action */}
          <div className="flex items-center justify-between pt-4 border-t border-white/20">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2.5">
                {event.event_access?.slice(0, 3).map((access) => (
                  <div key={access.user.id} className="relative">
                    <div className="w-8 h-8 rounded-full border-2 border-neutral-900 bg-neutral-800 flex items-center justify-center overflow-hidden shadow-sm">
                      {access.user.selfie_url ? (
                        <img 
                          src={access.user.selfie_url} 
                          alt={access.user.name} 
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
                        />
                      ) : (
                        <div className="bg-neutral-800 w-full h-full flex items-center justify-center">
                          <User size={14} weight="bold" className="text-neutral-400" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {(event._count?.event_access || event.event_access?.length || 0) > 3 && (
                  <div className="w-8 h-8 rounded-full border-2 border-neutral-900 bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-neutral-400 shadow-sm">
                    +{(event._count?.event_access || event.event_access?.length || 0) - Math.min(3, event.event_access?.length || 0)}
                  </div>
                )}
              </div>
              <p className="text-[10px] font-extrabold text-neutral-300 uppercase tracking-widest ml-1">
                Attendees
              </p>
            </div>

            <Button 
              className="rounded-full h-10 px-5 bg-white text-neutral-900 hover:bg-neutral-200 hover:scale-105 transition-all duration-300 shadow-lg shadow-black/20 group/btn"
            >
              <span className="mr-2">Gallery</span>
              <ArrowRight size={14} weight="bold" className="group-hover/btn:translate-x-1 transition-transform" />
            </Button>
        </div>
      </div>
    </motion.div>
  )
}