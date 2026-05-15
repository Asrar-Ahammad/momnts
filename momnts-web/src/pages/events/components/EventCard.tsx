import { useNavigate } from 'react-router'
import { format } from 'date-fns'
import { EventData } from '../../../features/events/services/events.api'
import { Button } from "../../../components/ui/button"
import { CalendarDotsIcon, MapPinAreaIcon } from '@phosphor-icons/react'

interface EventCardProps {
  event: EventData
}

const gradientThemes = [
  {
    // Ocean sunset
    bg: 'from-[#1a3a6b] via-[#e05a2b] to-[#f0a500]',
    wave1: '#c0392b',
    wave2: '#e8751a',
    wave3: '#1a5276',
  },
  {
    // Purple dusk
    bg: 'from-[#2d1b69] via-[#c0392b] to-[#e8751a]',
    wave1: '#6c3483',
    wave2: '#c0392b',
    wave3: '#2d1b69',
  },
  {
    // Forest teal
    bg: 'from-[#0d3b2e] via-[#16a085] to-[#f39c12]',
    wave1: '#0d6e4f',
    wave2: '#16a085',
    wave3: '#0d3b2e',
  },
  {
    // Rose gold
    bg: 'from-[#6b1a3a] via-[#e05a8a] to-[#f0c050]',
    wave1: '#c0395a',
    wave2: '#e8751a',
    wave3: '#6b1a3a',
  },
  {
    // Midnight blue
    bg: 'from-[#0a1628] via-[#1a4a8a] to-[#4a90d9]',
    wave1: '#1a3a6b',
    wave2: '#2e6da4',
    wave3: '#0a1628',
  },
  {
    // Emerald fire
    bg: 'from-[#0d3b2e] via-[#e05a2b] to-[#f0c050]',
    wave1: '#16a085',
    wave2: '#e8751a',
    wave3: '#0d3b2e',
  },
  {
    // Violet storm
    bg: 'from-[#1a0a3b] via-[#6c3483] to-[#e05a8a]',
    wave1: '#4a235a',
    wave2: '#9b59b6',
    wave3: '#1a0a3b',
  },
  {
    // Golden hour
    bg: 'from-[#3b1a0a] via-[#e07820] to-[#f0d050]',
    wave1: '#c0612b',
    wave2: '#e8a01a',
    wave3: '#3b1a0a',
  },
]

const getThemeForEvent = (eventId: string) => {
  let hash = 0
  for (let i = 0; i < eventId.length; i++) {
    const char = eventId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return gradientThemes[Math.abs(hash) % gradientThemes.length]
}

export const EventCard = ({ event }: EventCardProps) => {
  const navigate = useNavigate()
  const theme = getThemeForEvent(event.id)
  const isOrganizer = event.user_role === 'ORGANIZER'

  return (
    <div
      onClick={() => navigate(`/events/${event.id}`)}
      className="group cursor-pointer w-full bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
    >
      {/* ── Gradient image area with SVG waves ── */}
      <div className={`relative h-52 w-full bg-gradient-to-b ${theme.bg} overflow-hidden`}>

        {/* SVG layered waves — mimics the reference exactly */}
        <svg
          viewBox="0 0 400 220"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
        >
          {/* Wave layer 1 — back */}
          <path
            d="M0,80 C60,120 120,40 200,90 C280,140 340,60 400,80 L400,220 L0,220 Z"
            fill={theme.wave1}
            opacity="0.85"
          />
          {/* Wave layer 2 — middle */}
          <path
            d="M0,120 C80,80 160,160 240,110 C320,60 370,130 400,100 L400,220 L0,220 Z"
            fill={theme.wave2}
            opacity="0.9"
          />
          {/* Wave layer 3 — front */}
          <path
            d="M0,160 C100,130 180,190 280,150 C340,130 380,170 400,155 L400,220 L0,220 Z"
            fill={theme.wave3}
            opacity="0.6"
          />
        </svg>

        {/* Role badge — top left, dark pill like "FEATURED" in reference */}
        <div className="absolute top-0 left-0">
          <div className="bg-white/95 dark:bg-neutral-900/95 rounded-br-2xl rounded-tl-3xl px-4 py-2">
            <span className={`text-xs font-semibold tracking-widest uppercase
              ${isOrganizer ? 'text-amber-500' : 'text-neutral-500'}`}>
              {isOrganizer ? 'Organizer' : 'Attendee'}
            </span>
          </div>
        </div>

        {/* Active / inactive — top right corner, like "New" badge in reference */}
        <div className="absolute top-0 right-0">
          <div className={`px-4 py-2 rounded-bl-2xl rounded-tr-3xl bg-neutral-900/80`}>
            <span className="text-white text-xs font-semibold">
              {event.is_active ? <div className='flex items-center justify-center gap-2'> <div className='h-[8px] w-[8px] bg-green-500 rounded-full inline'></div> Active</div> : <div className='flex items-center justify-center gap-2'> <div className='h-[8px] w-[8px] bg-red-500 rounded-full inline'></div> Inactive</div>}
            </span>
          </div>
        </div>
      </div>

      {/* ── Card body ── */}
      <div className="p-5">
        {/* Event name */}
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 leading-snug capitalize line-clamp-1 mb-1">
          {event.name}
        </h2>

        {/* Description */}
        {/* <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed line-clamp-2 mb-4">
          {event.location} — {format(new Date(event.date), 'MMMM dd, yyyy')}. Join and relive every moment from this event.
        </p> */}
        <div className="flex flex-col items-start justify-center my-4 gap-2">
          <div className='flex items-center justify-start gap-2 text-sm'>
            <MapPinAreaIcon size={20} className='text-gray-500'/>
            <span className='capitalize'>{event.location}</span> 
          </div>
          <div className='flex items-center justify-start gap-2 text-sm'>
            <CalendarDotsIcon size={20} className='text-gray-500'/>
            <span className=''>{format(new Date(event.date), 'MMMM dd, yyyy')}</span> 
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-neutral-100 dark:border-neutral-800 mb-4" />

        {/* Footer — avatar + CTA like reference */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 leading-none">
                {event._count?.event_access || 0} attending
              </p>
            </div>
          </div>

          {/* CTA button — dark pill like "Read More" in reference */}
          <Button className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-semibold px-4 py-2 rounded-full hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-colors">
            View
          </Button>
        </div>
      </div>
    </div>
  )
}