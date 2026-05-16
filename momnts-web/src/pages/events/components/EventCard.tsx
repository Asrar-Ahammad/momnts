import { useNavigate } from 'react-router'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { EventData } from '../../../features/events/services/events.api'
import { Button } from "../../../components/ui/button"
import { CalendarDots, MapPin, ArrowRight, Crown, User } from '@phosphor-icons/react'
import { cn } from '../../../lib/utils'

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

  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={() => navigate(`/events/${event.id}`)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View details for event: ${event.name}`}
      className="group cursor-pointer w-full bg-white dark:bg-neutral-900 rounded-[32px] overflow-hidden shadow-sm hover:shadow-2xl border border-neutral-100 dark:border-neutral-800 transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500"
    >
      {/* Visual Header Section */}
      <div className={cn("relative h-48 w-full bg-gradient-to-br overflow-hidden", theme.bg)}>
        {/* Organic Animated Waves */}
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

        {/* Status & Role Badges */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/20 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold uppercase tracking-widest">
            {isOrganizer ? <Crown weight="fill" className="text-amber-300" /> : <User weight="bold" />}
            {isOrganizer ? 'Organizer' : 'Attendee'}
          </div>
          
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border text-[10px] font-bold uppercase tracking-widest",
            event.is_active 
              ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-100" 
              : "bg-red-500/20 border-red-500/30 text-red-100"
          )}>
            <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", event.is_active ? "bg-emerald-400" : "bg-red-400")} />
            {event.is_active ? 'Live' : 'Closed'}
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-6 relative">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight leading-tight capitalize line-clamp-1 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">
            {event.name}
          </h2>
          
          <div className="flex flex-col gap-2 mt-3">
            <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-sm font-medium">
              <div className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                <MapPin size={14} weight="bold" />
              </div>
              <span className="capitalize line-clamp-1">{event.location}</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-sm font-medium">
              <div className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                <CalendarDots size={14} weight="bold" />
              </div>
              <span>{format(new Date(event.date), 'MMM dd, yyyy')}</span>
            </div>
          </div>
        </div>

        {/* Footer Metrics & Action */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2.5">
              {event.event_access?.map((access) => (
                <div key={access.user.id} className="relative">
                  <div className="w-8 h-8 rounded-full border-2 border-white dark:border-neutral-900 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center overflow-hidden shadow-sm">
                    {access.user.selfie_url ? (
                      <img 
                        src={access.user.selfie_url} 
                        alt={access.user.name} 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
                      />
                    ) : (
                      <div className="bg-neutral-100 dark:bg-neutral-800 w-full h-full flex items-center justify-center">
                        <User size={14} weight="bold" className="text-neutral-400" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {event._count.event_access > (event.event_access?.length || 0) && (
                <div className="w-8 h-8 rounded-full border-2 border-white dark:border-neutral-900 bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-neutral-500 shadow-sm">
                  +{event._count.event_access - (event.event_access?.length || 0)}
                </div>
              )}
            </div>
            <p className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest ml-1">
              Attendees
            </p>
          </div>

          <Button 
            className="rounded-full h-10 px-5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:scale-105 transition-transform duration-300 shadow-lg shadow-black/10 dark:shadow-white/5 group/btn"
          >
            <span className="mr-2">Gallery</span>
            <ArrowRight size={14} weight="bold" className="group-hover/btn:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}