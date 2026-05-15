import { useState, useEffect, useRef } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover'
import { Calendar } from '../../components/ui/calendar'
import { format } from 'date-fns'
import { CalendarIcon, Plus, ArrowsDownUp, MagnifyingGlass, Ticket, Faders, CaretDown, Crown, User } from '@phosphor-icons/react'
import { eventsApi, EventData } from '../../features/events/services/events.api'
import { toast } from 'sonner'
import { EventCard, CreateEventModal, JoinEventModal } from './components'

const Events = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [events, setEvents] = useState<EventData[]>([])
  const [loading, setLoading] = useState(true)

  // Role Filter State
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ORGANIZER' | 'ATTENDEE'>('ALL')
  const [isRoleFilterOpen, setIsRoleFilterOpen] = useState(false)

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [joinModalOpen, setJoinModalOpen] = useState(false)
  const [initialJoinCode, setInitialJoinCode] = useState('')

  const searchInputRef = useRef<HTMLInputElement>(null)

  // "/" keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('joinCode')
    if (code) {
      setInitialJoinCode(code)
      setJoinModalOpen(true)
      
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true)
        const [myEvents, joinedEvents] = await Promise.all([
          eventsApi.getMyEvents(),
          eventsApi.getJoinedEvents()
        ])
        const allEvents = [...myEvents, ...joinedEvents]
        const uniqueEvents = allEvents.filter((event, index, self) =>
          index === self.findIndex((e) => e.id === event.id)
        )
        setEvents(uniqueEvents)
      } catch (error) {
        console.error('Failed to fetch events:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to fetch events')
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  const filteredEvents = events
    .filter(event =>
      event.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(event => {
      if (roleFilter === 'ALL') return true
      return event.user_role === roleFilter
    })
    .filter(event => {
      if (!dateRange.from && !dateRange.to) return true
      const eventDate = new Date(event.date)
      const fromDate = dateRange.from ? new Date(dateRange.from) : null
      const toDate = dateRange.to ? new Date(dateRange.to) : null

      if (fromDate && eventDate < fromDate) return false
      if (toDate && eventDate > toDate) return false
      return true
    })
    .sort((a: EventData, b: EventData) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
    })

  const handleEventsUpdate = (updatedEvents: EventData[]) => {
    setEvents(updatedEvents)
  }

  const handleResetFilters = () => {
    setSearchQuery('')
    setDateRange({ from: undefined, to: undefined })
    setSortOrder('desc')
    setRoleFilter('ALL')
  }

  const getRoleFilterLabel = () => {
    switch (roleFilter) {
      case 'ORGANIZER': return 'Organizing'
      case 'ATTENDEE': return 'Attending'
      default: return 'All Events'
    }
  }

  const getRoleFilterIcon = () => {
    switch (roleFilter) {
      case 'ORGANIZER': return <Crown size={16} weight="bold" />
      case 'ATTENDEE': return <User size={16} weight="bold" />
      default: return <Faders size={16} weight="bold" />
    }
  }

  return (
    <div className="space-y-6 pt-8">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-2">
        <h1 className="text-6xl font-bold font-sirage">Events</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="cursor-pointer px-4 rounded-full" onClick={() => setCreateModalOpen(true)}>
            <Plus size={16} weight="bold" className="mr-2" />
            Create Event
          </Button>
          <Button className="cursor-pointer rounded-full px-4" onClick={() => setJoinModalOpen(true)}>
            <Ticket size={16} weight="fill" className="mr-2" />
            Join Event
          </Button>
        </div>
      </div>

      {/* Search and Filter Row */}
      <div className="flex items-center flex-wrap gap-2">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <Input
              ref={searchInputRef}
              placeholder="Search events by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-10 pr-12 w-[90vw] md:w-full rounded-full"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 items-center rounded border border-neutral-200 bg-neutral-100 px-1.5 font-mono text-[11px] font-medium text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
              /
            </kbd>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="flex items-center gap-2 cursor-pointer"
        >
          <ArrowsDownUp size={16} weight="bold" />
          Sort by Date
        </Button>

        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger>
            <Button variant="outline" size="sm" className="flex items-center gap-2 cursor-pointer">
              <CalendarIcon size={16} weight="bold" />
              {dateRange.from && dateRange.to
                ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd')}`
                : 'Filter by Date'
              }
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={{
                from: dateRange.from,
                to: dateRange.to
              }}
              onSelect={(range) => {
                setDateRange({ from: range?.from, to: range?.to })
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        <Popover open={isRoleFilterOpen} onOpenChange={setIsRoleFilterOpen}>
          <PopoverTrigger>
            <Button variant="outline" size="sm" className="flex items-center gap-2 cursor-pointer">
              {getRoleFilterIcon()}
              {getRoleFilterLabel()}
              <CaretDown size={12} weight="bold" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-1" align="end">
            <div className="flex flex-col gap-1">
              <Button
                variant={roleFilter === 'ALL' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setRoleFilter('ALL')
                  setIsRoleFilterOpen(false)
                }}
                className="justify-start cursor-pointer"
              >
                <Faders size={16} weight="bold" className="mr-2" />
                All Events
              </Button>
              <Button
                variant={roleFilter === 'ORGANIZER' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setRoleFilter('ORGANIZER')
                  setIsRoleFilterOpen(false)
                }}
                className="justify-start cursor-pointer"
              >
                <Crown size={16} weight="fill" className="mr-2" />
                Organizing
              </Button>
              <Button
                variant={roleFilter === 'ATTENDEE' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setRoleFilter('ATTENDEE')
                  setIsRoleFilterOpen(false)
                }}
                className="justify-start cursor-pointer"
              >
                <User size={16} weight="fill" className="mr-2" />
                Attending
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {(searchQuery || dateRange.from || dateRange.to || sortOrder !== 'desc' || roleFilter !== 'ALL') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="flex items-center gap-2 text-neutral-500 hover:text-neutral-700 cursor-pointer"
          >
            <Faders size={16} weight="bold" />
            Reset Filters
          </Button>
        )}
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>

      {loading && (
        <div className="text-center py-12">
          <p className="text-neutral-500">Loading events...</p>
        </div>
      )}

      {!loading && filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <p className="text-neutral-500">
            {searchQuery || dateRange.from ? 'No events found matching your filters.' : 'No events yet. Create or join an event!'}
          </p>
        </div>
      )}

      {/* Modals */}
      <CreateEventModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onEventCreated={handleEventsUpdate}
      />

      <JoinEventModal
        open={joinModalOpen}
        onOpenChange={setJoinModalOpen}
        onEventJoined={handleEventsUpdate}
        initialInviteCode={initialJoinCode}
      />
    </div>
  )
}

export default Events
