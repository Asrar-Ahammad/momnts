import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { useEvents } from '../../features/events/hooks/useEvents'
import { EventCard } from '../events/components/EventCard'
import { CreateEventModal, JoinEventModal } from '../events/components'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/skeleton'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '../../lib/utils'
import { motion } from 'framer-motion'
import { MomntsSlideshow } from '../../components/MomntsSlideshow'
import { EventData } from '../../features/events/services/events.api'
import { MomntCard } from './components/MomntCard'
import {
  CameraPlus,
  PlusCircle,
  Ticket,
  X,
  MusicNotes,
  CaretLeft,
  CaretRight
} from '@phosphor-icons/react'


const Home = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { events, isLoading } = useEvents()
  const queryClient = useQueryClient()

  const [showSelfieBanner, setShowSelfieBanner] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [joinModalOpen, setJoinModalOpen] = useState(false)
  const [selectedSlideshowEvent, setSelectedSlideshowEvent] = useState<{
    id: string
    name: string
    location: string
    date: string
  } | null>(null)




  const handleEventsUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['events'] })
  }

  const upcomingEvents = events
    .filter((event) => new Date(event.date) > new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3)

  const pastEvents = events
    .filter((event) => new Date(event.date) <= new Date())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3)

  const recentEvent = events.length > 0 ? events[0] : null

  if (!isLoading && events.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 select-none rounded-full flex items-center justify-center text-4xl mb-6">
          📸
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2 select-none">No events yet</h2>
        <p className="text-neutral-500 dark:text-neutral-400 max-w-sm mb-8 select-none">
          Create your first event or join one with an invite code.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Button
            className="rounded-full h-12 px-8 bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900"
            onClick={() => setCreateModalOpen(true)}
          >
            <PlusCircle size={20} weight="bold" className="mr-2" />
            Create Event
          </Button>
          <Button
            variant="outline"
            className="rounded-full h-12 px-8 border-neutral-200 dark:border-neutral-700"
            onClick={() => setJoinModalOpen(true)}
          >
            <Ticket size={20} weight="bold" className="mr-2" />
            Join Event
          </Button>
        </div>

        <CreateEventModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onEventCreated={handleEventsUpdate}
        />
        <JoinEventModal
          open={joinModalOpen}
          onOpenChange={setJoinModalOpen}
          onEventJoined={handleEventsUpdate}
        />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10 pb-24">
      {/* 1. Greeting header */}
      <div className="space-y-1">
        <h1 className="text-6xl font-bold font-sirage text-neutral-900 dark:text-neutral-100 select-none">
          Hey <span className="capitalize">{user?.username || 'there'}</span>!
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 select-none">
          Here's what's happening with your events.
        </p>
      </div>

      {/* 2. Selfie prompt banner */}
      {showSelfieBanner && !user?.selfie_url && (
        <div className="relative overflow-hidden bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 rounded-2xl p-6 flex items-start gap-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-xl text-amber-600 dark:text-amber-400">
            <CameraPlus size={24} weight="bold" />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="font-bold text-amber-900 dark:text-amber-100 select-none">Add your photo</h3>
            <p className="text-sm text-amber-800/80 dark:text-amber-200/80 max-w-lg select-none">
              Upload a selfie so Momnts can find you in event photos.
            </p>
            <Button
              size="sm"
              className="mt-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
              onClick={() => navigate('/profile')}
            >
              Upload Selfie
            </Button>
          </div>
          <button
            onClick={() => setShowSelfieBanner(false)}
            className="text-amber-900/50 dark:text-amber-100/50 hover:text-amber-900 dark:hover:text-amber-100"
          >
            <X size={20} weight="bold" />
          </button>
        </div>
      )}

      {/* 3. Quick actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          className="rounded-full h-11 px-8 bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 font-medium"
          onClick={() => setCreateModalOpen(true)}
        >
          <PlusCircle size={20} weight="bold" className="mr-2" />
          Create Event
        </Button>
        <Button
          variant="outline"
          className="rounded-full h-11 px-8 border-neutral-200 dark:border-neutral-700 font-medium"
          onClick={() => setJoinModalOpen(true)}
        >
          <Ticket size={20} weight="bold" className="mr-2" />
          Join Event
        </Button>
      </div>

      {/* 3.5. Relive Your Momnts Memory Lanes */}
      <div className="space-y-4 relative group">
        <div className="flex items-center justify-between gap-2">
          
          <h2 className="text-2xl font-sirage font-bold text-neutral-800 dark:text-neutral-200 select-none">
            Momnts Memory Lanes
          </h2>
          
          {events.length > 0 && (
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm"
                onClick={() => {
                  const el = document.getElementById('memory-lane-container')
                  if (el) el.scrollBy({ left: -320, behavior: 'smooth' })
                }}
              >
                <CaretLeft size={16} weight="bold" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm"
                onClick={() => {
                  const el = document.getElementById('memory-lane-container')
                  if (el) el.scrollBy({ left: 320, behavior: 'smooth' })
                }}
              >
                <CaretRight size={16} weight="bold" />
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex gap-6 overflow-x-auto scrollbar-hide py-2">
            <Skeleton className="h-72 w-48 rounded-2xl shrink-0 bg-neutral-200 dark:bg-neutral-800" />
            <Skeleton className="h-72 w-48 rounded-2xl shrink-0 bg-neutral-200 dark:bg-neutral-800" />
            <Skeleton className="h-72 w-48 rounded-2xl shrink-0 bg-neutral-200 dark:bg-neutral-800" />
          </div>
        ) : events.length > 0 ? (
          <div id="memory-lane-container" className="flex gap-6 overflow-x-auto scrollbar-hide py-2 px-1 scroll-smooth snap-x snap-mandatory">
            {events.map((event) => (
              <div key={event.id} className="snap-start shrink-0">
                <MomntCard
                  event={event}
                  onClick={() => {
                    setSelectedSlideshowEvent({
                      id: event.id,
                      name: event.name,
                      location: event.location,
                      date: event.date
                    })
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500 italic">No events available for Momnts</p>
        )}
      </div>

      {/* 4. Continue where you left off */}
      {isLoading ? (
        <div className="space-y-4">
          <h2 className="text-2xl font-sirage font-semibold text-neutral-800 dark:text-neutral-200 select-none">Continue where you left off</h2>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : recentEvent ? (
        <div className="space-y-4">
          <h2 className="text-2xl font-sirage font-semibold text-neutral-800 dark:text-neutral-200 select-none">Continue where you left off</h2>
          <EventCard event={recentEvent} />
        </div>
      ) : null}

      {/* 5. Upcoming events */}
      <div className="space-y-4">
        <h2 className="text-2xl font-sirage font-semibold text-neutral-800 dark:text-neutral-200 select-none">Upcoming Events</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        ) : upcomingEvents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500 italic select-none">No upcoming events</p>
        )}
      </div>

      {/* 6. Past events */}
      {isLoading ? (
        <div className="space-y-4">
          <h2 className="text-2xl font-sirage font-semibold text-neutral-800 dark:text-neutral-200 select-none">Past Events</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      ) : pastEvents.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-2xl font-sirage font-semibold text-neutral-800 dark:text-neutral-200 select-none">Past Events</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {pastEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      ) : null}

      <CreateEventModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onEventCreated={handleEventsUpdate}
      />
      <JoinEventModal
        open={joinModalOpen}
        onOpenChange={setJoinModalOpen}
        onEventJoined={handleEventsUpdate}
      />

      {/* 7. Fullscreen Cinematic Slideshow */}
      <MomntsSlideshow
        open={selectedSlideshowEvent !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedSlideshowEvent(null)
        }}
        eventId={selectedSlideshowEvent?.id || ''}
        eventName={selectedSlideshowEvent?.name || ''}
        eventLocation={selectedSlideshowEvent?.location || ''}
        eventDate={selectedSlideshowEvent?.date || ''}
      />
    </div>

  )
}

export default Home