import * as React from 'react'
import { useNavigate } from 'react-router'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { EventData } from '../../../features/events/services/events.api'
import { MapPin, CalendarDots, Users, ArrowRight, Lock, Image as ImageIcon } from '@phosphor-icons/react'
import { photosApi } from '../../../features/events/services/photos.api'

interface EventListItemProps {
  event: EventData
  index?: number
}

const coverPhotoCache = new Map<string, string>();

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

export const EventListItem = ({ event, index = 0 }: EventListItemProps) => {
  const navigate = useNavigate()
  const isOrganizer = event.user_role === 'ORGANIZER'
  const theme = getThemeForEvent(event.id)

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
    if (event.encryption_mode === 'E2EE') return;

    if (initialCover) {
      setCoverPhoto(initialCover);
      coverPhotoCache.set(event.id, initialCover);
      return;
    }

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
          if (url) {
            setCoverPhoto(url);
            coverPhotoCache.set(event.id, url);
          }
        }
      })
      .catch(() => {});

    return () => { mounted = false; };
  }, [event.id, event.encryption_mode, initialCover]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => navigate(`/events/${event.id}`)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View details for event: ${event.name}`}
      className="group cursor-pointer w-full bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[20px] sm:rounded-[24px] p-3 sm:p-4
        flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5
        hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:border-neutral-200 dark:hover:border-neutral-700
        transition-all duration-300 hover:-translate-y-0.5
        focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:focus:ring-neutral-700"
    >
      <div className="flex flex-row items-center gap-3 sm:gap-5">
        {/* Thumbnail */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-[14px] sm:rounded-xl overflow-hidden relative shadow-sm">
          {coverPhoto && event.encryption_mode !== 'E2EE' ? (
            <img src={coverPhoto} alt={event.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${theme.bg} flex items-center justify-center`}>
               {event.encryption_mode === 'E2EE' 
                 ? <Lock size={24} weight="fill" className="text-white/80" />
                 : <ImageIcon size={24} weight="fill" className="text-white/80" />
               }
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-50 capitalize truncate">
              {event.name}
            </h3>
            {event.encryption_mode === 'E2EE' && (
              <span className="inline-flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full p-1 shrink-0">
                <Lock size={10} sm:size={12} weight="fill" />
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 sm:gap-y-2 text-xs sm:text-sm font-medium text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1 sm:gap-1.5 capitalize shrink-0">
              <MapPin size={14} className="text-neutral-400 dark:text-neutral-500" />
              <span className="truncate max-w-[100px] sm:max-w-[150px]">{event.location}</span>
            </span>
            <span className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <CalendarDots size={14} className="text-neutral-400 dark:text-neutral-500" />
              {format(new Date(event.date), 'MMM dd, yyyy')}
            </span>
            <span className="hidden sm:flex items-center gap-1.5 shrink-0">
              <Users size={16} className="text-neutral-400 dark:text-neutral-500" />
              {event._count?.event_access || 0} attending
            </span>
          </div>
        </div>
      </div>

      {/* Badges & Arrow */}
      <div className="flex flex-row items-center gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-neutral-800 ml-0 sm:ml-auto pl-1 sm:pl-0 justify-between sm:justify-start">
        <div className="flex gap-2">
          <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${
            isOrganizer
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
              : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
          }`}>
            {isOrganizer ? 'Organizer' : 'Attendee'}
          </span>
          <span className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${
            event.is_active
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
              : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${event.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400 dark:bg-neutral-600'}`} />
            {event.is_active ? 'Active' : 'Ended'}
          </span>
        </div>
        
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 group-hover:bg-neutral-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-neutral-900 transition-colors shrink-0">
          <ArrowRight size={16} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </motion.div>
  )
}
