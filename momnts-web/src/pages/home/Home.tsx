import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { useEvents } from '../../features/events/hooks/useEvents'
import { CreateEventModal, JoinEventModal } from '../events/components'
import { useQueryClient } from '@tanstack/react-query'
import { MomntsSlideshow } from '../../components/MomntsSlideshow'
import { MomntCard } from './components/MomntCard'
import { cn } from '../../lib/utils'
import {
  PlusCircle,
  Ticket,
  CameraPlus,
  ArrowRight,
  CalendarBlank,
  Images
} from '@phosphor-icons/react'
import { useWebHaptics } from 'web-haptics/react'
import { format } from 'date-fns'

const Home = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { events, isLoading } = useEvents()
  const queryClient = useQueryClient()
  const haptic = useWebHaptics()

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [joinModalOpen, setJoinModalOpen] = useState(false)
  const [selectedSlideshowEvent, setSelectedSlideshowEvent] = useState<{
    id: string
    name: string
    location: string
    date: string
  } | null>(null)

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return 'Good morning'
    if (hour >= 12 && hour < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const handleEventsUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['events'] })
  }

  const upcomingEvents = useMemo(() => 
    events
      .filter((event) => new Date(event.date) > new Date())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [events]
  )

  const pastEvents = useMemo(() => 
    events
      .filter((event) => new Date(event.date) <= new Date())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [events]
  )

  const featuredEvent = useMemo(() => {
    return pastEvents.find(e => (e._count?.photos || 0) > 0 && e.encryption_mode !== 'E2EE') || pastEvents[0]
  }, [pastEvents])

  const spotlightPhoto = featuredEvent?.photos?.[0]?.display_url || featuredEvent?.photos?.[0]?.thumb_url

  if (!isLoading && events.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 pt-12 lg:pt-16 pb-24 flex flex-col items-center justify-center min-h-[70vh] text-center">
        <div className="w-24 h-24 bg-neutral-900 border border-white/5 rounded-[2rem] flex items-center justify-center text-5xl mb-8 shadow-2xl bento-tile">
          🍱
        </div>
        <h1 className="text-4xl font-sirage font-bold text-neutral-900 dark:text-neutral-50 mb-4 tracking-tight">
          Welcome to Momnts
        </h1>
        <p className="text-lg text-neutral-500 dark:text-neutral-400 max-w-md mb-12">
          Your photo journey starts here. Create an event or join one to begin capturing memories.
        </p>
        <div className="flex flex-row gap-3 w-full sm:w-auto mt-4 px-4 sm:px-0">
          <button
            className="flex-1 h-14 px-2 sm:px-8 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center gap-2 font-bold hover:scale-105 transition-transform whitespace-nowrap text-sm sm:text-base"
            onClick={() => { haptic.trigger("medium"); setCreateModalOpen(true) }}
          >
            <PlusCircle size={22} weight="fill" /> Create
          </button>
          <button
            className="flex-1 h-14 px-2 sm:px-8 rounded-full border border-neutral-200 dark:border-neutral-800 flex items-center justify-center gap-2 font-bold hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors whitespace-nowrap text-sm sm:text-base"
            onClick={() => { haptic.trigger("medium"); setJoinModalOpen(true) }}
          >
            <Ticket size={22} weight="fill" /> Join
          </button>
        </div>
        <CreateEventModal open={createModalOpen} onOpenChange={setCreateModalOpen} onEventCreated={handleEventsUpdate} />
        <JoinEventModal open={joinModalOpen} onOpenChange={setJoinModalOpen} onEventJoined={handleEventsUpdate} />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 md:pt-8 lg:pt-12 pb-24">
      
      {/* ── BENTO GRID ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 auto-rows-auto gap-4 md:gap-6">
        
        {/* 1. Welcome Hero (Top Left, 2-col) */}
        <div className="bento-tile md:col-span-2 p-8 md:p-10 flex flex-col justify-between min-h-[280px]">
          <div>
            <h1 className="text-3xl md:text-5xl font-sirage font-bold text-neutral-900 dark:text-white tracking-tight mb-2">
              {greeting}, <span className="capitalize">{user?.username || 'there'}</span>
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm md:text-lg">
              {upcomingEvents.length > 0 
                ? `You have ${upcomingEvents.length} events coming up.` 
                : "Let's capture some new memories today."}
            </p>
          </div>
          
          <div className="flex flex-row gap-3 mt-8">
            <button
              onClick={() => { haptic.trigger("light"); setCreateModalOpen(true) }}
              className="flex-1 h-12 px-2 sm:px-6 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:scale-105 transition-transform font-bold flex items-center justify-center gap-2 shadow-lg whitespace-nowrap text-sm sm:text-base"
            >
              <PlusCircle size={20} weight="fill" /> Create
            </button>
            <button
              onClick={() => { haptic.trigger("light"); setJoinModalOpen(true) }}
              className="flex-1 h-12 px-2 sm:px-6 rounded-full bg-neutral-100 dark:bg-white/10 text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-white/20 transition-colors font-bold flex items-center justify-center gap-2 whitespace-nowrap text-sm sm:text-base"
            >
              <Ticket size={20} weight="fill" /> Join
            </button>
          </div>
        </div>

        {/* 2. Smart Photo Tile (Top Right, 1-col) */}
        {!user?.selfie_url ? (
          <div 
            onClick={() => { haptic.trigger("light"); navigate('/profile') }}
            className="bento-tile p-8 flex flex-col items-center justify-center text-center cursor-pointer group min-h-[280px]"
          >
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <CameraPlus size={32} weight="fill" />
            </div>
            <h3 className="font-bold text-neutral-900 dark:text-white text-lg">Add Selfie</h3>
            <p className="text-sm text-neutral-500 mt-1">Enable auto-tagging.</p>
          </div>
        ) : spotlightPhoto ? (
          <div className="bento-tile p-0 relative overflow-hidden min-h-[280px] group cursor-pointer" onClick={() => navigate(`/events/${featuredEvent.id}`)}>
            <img src={spotlightPhoto} alt="Spotlight" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6 w-full">
              <p className="text-white/70 text-xs font-bold uppercase tracking-wider mb-1">Spotlight</p>
              <p className="text-white font-bold truncate">{featuredEvent.name}</p>
            </div>
          </div>
        ) : (
          <div className="bento-tile p-8 flex flex-col items-center justify-center text-center min-h-[280px]">
             <CameraPlus size={48} className="text-neutral-200 dark:text-neutral-800 mb-4" />
             <p className="text-neutral-400 font-medium text-sm">Your photos will appear here.</p>
          </div>
        )}

        {/* 3. Memory Lanes Gallery (Middle Row, Full Width) */}
        {pastEvents.length > 0 && (
          <div className="bento-tile md:col-span-3 p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-sirage font-bold text-neutral-900 dark:text-white">Memory Lanes</h2>
            </div>
            
            <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory scrollbar-hide -mx-6 px-6 md:-mx-8 md:px-8">
              {pastEvents.map((event) => (
                <div key={event.id} className="snap-start shrink-0">
                  <MomntCard
                    event={event}
                    className="w-48 h-72" // Fixed size for horizontal scrolling
                    onClick={() => {
                      haptic.trigger("light");
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
          </div>
        )}

        {/* 4. Jump Back In (Bottom Left, 2-col) */}
        {featuredEvent && (
          <div 
            onClick={() => { haptic.trigger("light"); navigate(`/events/${featuredEvent.id}`) }}
            className="bento-tile md:col-span-2 p-0 relative overflow-hidden min-h-[350px] group cursor-pointer"
          >
            {spotlightPhoto ? (
              <img src={spotlightPhoto} alt={featuredEvent.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            ) : (
              <div className="absolute inset-0 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                <CameraPlus size={48} className="text-neutral-300 dark:text-neutral-700" />
              </div>
            )}
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            
            <div className="absolute bottom-0 left-0 p-8 w-full flex items-end justify-between">
              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider mb-3">
                  Jump Back In
                </span>
                <h3 className="text-3xl font-sirage font-bold text-white mb-1">{featuredEvent.name}</h3>
                <p className="text-white/70 font-medium">{format(new Date(featuredEvent.date), 'MMM d, yyyy')}</p>
              </div>
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-colors">
                <Images size={24} weight="fill" />
              </div>
            </div>
          </div>
        )}

        {/* 5. Up Next (Bottom Right, 1-col) */}
        <div className="bento-tile md:col-span-1 p-6 flex flex-col min-h-[350px]">
          <h2 className="text-xl font-sirage font-bold text-neutral-900 dark:text-white mb-6">Up Next</h2>
          
          <div className="flex flex-col gap-3 flex-1">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.slice(0, 3).map(event => {
                const eventPhoto = event.photos?.[0]?.thumb_url;
                return (
                  <div 
                    key={event.id}
                    onClick={() => navigate(`/events/${event.id}`)}
                    className="flex items-center gap-4 p-3 rounded-2xl hover:bg-neutral-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <div className="w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 relative">
                      {eventPhoto ? (
                        <img src={eventPhoto} alt={event.name} className="w-full h-full object-cover" />
                      ) : (
                         <div className="w-full h-full flex flex-col items-center justify-center text-neutral-500">
                           <span className="text-[10px] font-bold uppercase">{format(new Date(event.date), 'MMM')}</span>
                           <span className="text-lg font-black leading-none">{format(new Date(event.date), 'd')}</span>
                         </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-neutral-900 dark:text-white truncate">{event.name}</p>
                      <p className="text-xs text-neutral-500 truncate">{event.location}</p>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-neutral-500 p-4">
                <CalendarBlank size={32} className="mb-2 opacity-50" />
                <p className="text-sm font-medium">No upcoming events</p>
              </div>
            )}
          </div>
          
          {upcomingEvents.length > 3 && (
            <button className="mt-4 w-full py-3 rounded-xl bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors text-sm font-bold text-neutral-700 dark:text-neutral-300">
              View all
            </button>
          )}
        </div>

      </div>

      {/* ── MODALS ────────────────────────────────────────────── */}
      <CreateEventModal open={createModalOpen} onOpenChange={setCreateModalOpen} onEventCreated={handleEventsUpdate} />
      <JoinEventModal open={joinModalOpen} onOpenChange={setJoinModalOpen} onEventJoined={handleEventsUpdate} />

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
