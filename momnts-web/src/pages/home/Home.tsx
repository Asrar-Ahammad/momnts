import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { useEvents } from '../../features/events/hooks/useEvents'
import { EventCard } from '../events/components/EventCard'
import { CreateEventModal, JoinEventModal } from '../events/components'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/skeleton'
import { useQueryClient } from '@tanstack/react-query'
import {
  CameraPlus,
  PlusCircle,
  Ticket,
  X
} from '@phosphor-icons/react'

const Home = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { events, isLoading } = useEvents()
  const queryClient = useQueryClient()

  const [showSelfieBanner, setShowSelfieBanner] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [joinModalOpen, setJoinModalOpen] = useState(false)

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
        <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center text-4xl mb-6">
          📸
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">No events yet</h2>
        <p className="text-neutral-500 dark:text-neutral-400 max-w-sm mb-8">
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
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      {/* 1. Greeting header */}
      <div className="space-y-1">
        <h1 className="text-6xl font-bold font-sirage text-neutral-900 dark:text-neutral-100">
          Hey {user?.username || 'there'}!
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400">
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
            <h3 className="font-bold text-amber-900 dark:text-amber-100">Add your photo</h3>
            <p className="text-sm text-amber-800/80 dark:text-amber-200/80 max-w-lg">
              Upload a selfie so Momnts can find you in event photos.
            </p>
            <Button
              size="sm"
              className="mt-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
              onClick={() => navigate('/onboarding')}
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

      {/* 4. Continue where you left off */}
      {isLoading ? (
        <div className="space-y-4">
          <h2 className="text-2xl font-sirage font-semibold text-neutral-800 dark:text-neutral-200">Continue where you left off</h2>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : recentEvent ? (
        <div className="space-y-4">
          <h2 className="text-2xl font-sirage font-semibold text-neutral-800 dark:text-neutral-200">Continue where you left off</h2>
          <EventCard event={recentEvent} />
        </div>
      ) : null}

      {/* 5. Upcoming events */}
      <div className="space-y-4">
        <h2 className="text-2xl font-sirage font-semibold text-neutral-800 dark:text-neutral-200">Upcoming Events</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        ) : upcomingEvents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500 italic">No upcoming events</p>
        )}
      </div>

      {/* 6. Past events */}
      {isLoading ? (
        <div className="space-y-4">
          <h2 className="text-2xl font-sirage font-semibold text-neutral-800 dark:text-neutral-200">Past Events</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      ) : pastEvents.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-2xl font-sirage font-semibold text-neutral-800 dark:text-neutral-200">Past Events</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
    </div>
  )
}

export default Home