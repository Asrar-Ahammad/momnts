import { motion } from 'framer-motion'
import { cn } from '../../../lib/utils'
import { EventData } from '../../../features/events/services/events.api'
import { toast } from 'sonner'

const momntThemes = [
  { bg: 'from-neutral-900 via-neutral-950 to-black' },
  { bg: 'from-neutral-800 via-neutral-900 to-neutral-950' },
  { bg: 'from-neutral-950 via-neutral-900 to-neutral-800' },
  { bg: 'from-neutral-900 to-neutral-950' },
  { bg: 'from-neutral-950 to-neutral-900' },
]

const getThemeForMomnt = (eventId: string) => {
  let hash = 0
  for (let i = 0; i < eventId.length; i++) {
    hash = eventId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return momntThemes[Math.abs(hash) % momntThemes.length]
}

interface MomntCardProps {
  event: EventData
  onClick: () => void
}

export const MomntCard = ({ event, onClick }: MomntCardProps) => {
  const photoCount = event._count?.photos || 0
  const coverPhoto = event.photos?.[0]?.thumb_url || event.photos?.[0]?.display_url || null

  if (photoCount === 0) {
    return null
  }

  const handleCardClick = () => {
    if (photoCount < 5) {
      toast.warning('At least 5 photos are required to start the Memory Lane slideshow.')
      return
    }
    onClick()
  }

  const theme = getThemeForMomnt(event.id)

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={handleCardClick}
      className={cn(
        "shrink-0 w-48 h-72 rounded-2xl relative overflow-hidden shadow-md hover:shadow-xl border border-neutral-200/10 cursor-pointer flex flex-col justify-between p-5 text-white select-none group transition-all",
        coverPhoto ? "bg-neutral-900" : theme.bg
      )}
    >
      {/* Event Photo Cover Background */}
      {coverPhoto && (
        <img
          src={coverPhoto}
          alt={event.name}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 pointer-events-none"
        />
      )}

      {/* Dark/Glassmorphic Overlay grid background */}
      <div className={cn(
        "absolute inset-0 transition-colors duration-300 pointer-events-none",
        coverPhoto ? "bg-black/45 group-hover:bg-black/55" : "bg-black/10 group-hover:bg-black/20"
      )} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)] pointer-events-none" />

      {/* Organic animated blobs (only when using fallback gradient background) */}
      {!coverPhoto && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
          <div className="absolute -top-12 -left-12 w-28 h-28 bg-white/20 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500" />
        </div>
      )}

      {/* Top content: role and photo count pill */}
      <div className="flex justify-between items-start z-10">
      </div>

      {/* Bottom content: name */}
      <div className="z-10 space-y-1 w-full">
        <h3 className="text-lg font-bold tracking-tight capitalize line-clamp-1 group-hover:text-white transition-colors">
          {event.name}
        </h3>
        <p className="text-[10px] text-white/70 font-medium tracking-wide line-clamp-1 capitalize">
          {event.location}
        </p>
      </div>
    </motion.div>
  )
}
