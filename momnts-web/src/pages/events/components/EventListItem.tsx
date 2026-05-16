import { useNavigate } from 'react-router'
import { format } from 'date-fns'
import { EventData } from '../../../features/events/services/events.api'
import { Button } from "../../../components/ui/button"
import { MapPinAreaIcon, CalendarDotsIcon, Users, ArrowRight } from '@phosphor-icons/react'

interface EventListItemProps {
  event: EventData
}

export const EventListItem = ({ event }: EventListItemProps) => {
  const navigate = useNavigate()
  const isOrganizer = event.user_role === 'ORGANIZER'

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      navigate(`/events/${event.id}`)
    }
  }

  return (
    <div
      onClick={() => navigate(`/events/${event.id}`)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View details for event: ${event.name}`}
      className="group cursor-pointer w-full bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-100 dark:border-neutral-800 hover:shadow-lg transition-all duration-300 flex flex-col md:flex-row items-center gap-4 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500"
    >
      <div className="flex-1 flex flex-col md:flex-row md:items-center gap-4 w-full">
        <div className="flex-1 text-left">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 capitalize line-clamp-1">
            {event.name}
          </h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-neutral-500">
            <div className="flex items-center gap-1.5 capitalize">
              <MapPinAreaIcon size={16} />
              {event.location}
            </div>
            <div className="flex items-center gap-1.5">
              <CalendarDotsIcon size={16} />
              {format(new Date(event.date), 'MMM dd, yyyy')}
            </div>
            <div className="flex items-center gap-1.5">
              <Users size={16} />
              {event._count?.event_access || 0} attending
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            isOrganizer ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-neutral-50 text-neutral-600 dark:bg-neutral-500/10 dark:text-neutral-400'
          }`}>
            {isOrganizer ? 'Organizer' : 'Attendee'}
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            event.is_active ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
          }`}>
            <div className={`h-1.5 w-1.5 rounded-full ${event.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {event.is_active ? 'Active' : 'Inactive'}
          </div>
        </div>
      </div>

      <div className="hidden md:block">
        <Button variant="ghost" size="icon" className="rounded-full group-hover:bg-neutral-100 dark:group-hover:bg-neutral-800 transition-colors">
          <ArrowRight size={20} />
        </Button>
      </div>
    </div>
  )
}
