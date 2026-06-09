import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover'
import { Calendar } from '../../components/ui/calendar'
import { format } from 'date-fns'
import { 
  CalendarIcon, 
  Ticket, 
  Faders, 
  CaretDown, 
  Crown, 
  User,
  SquaresFour,
  Rows,
  CakeIcon,
  CircleNotch,
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowsDownUpIcon
} from '@phosphor-icons/react'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger, 
  DropdownMenuGroup 
} from '../../components/ui/dropdown-menu'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '../../components/ui/dialog'
import { eventsApi, EventData } from '../../features/events/services/events.api'
import { toast } from 'sonner'
import { EventCard, CreateEventModal, JoinEventModal, EventListItem } from './components'
import { useEvents } from '../../features/events/hooks/useEvents'
import { useQueryClient } from '@tanstack/react-query'
import { useWebHaptics } from 'web-haptics/react'

const Events = () => {
  const haptic = useWebHaptics()
  const [searchQuery, setSearchQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [isMobileCalendarOpen, setIsMobileCalendarOpen] = useState(false)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const { events, isLoading: loading } = useEvents()
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

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

  const [visibleCount, setVisibleCount] = useState(6)
  const [isPageLoading, setIsPageLoading] = useState(false)

  const visibleCountRef = useRef(visibleCount)
  const eventsLengthRef = useRef(filteredEvents.length)
  const isPageLoadingRef = useRef(isPageLoading)
  const observerInstanceRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    visibleCountRef.current = visibleCount
    eventsLengthRef.current = filteredEvents.length
    isPageLoadingRef.current = isPageLoading
  })

  // Reset pagination when search query or filters change
  useEffect(() => {
    setVisibleCount(6)
    setIsPageLoading(false)
  }, [searchQuery, dateRange.from, dateRange.to, sortOrder, roleFilter])

  useEffect(() => {
    return () => {
      if (observerInstanceRef.current) {
        observerInstanceRef.current.disconnect()
      }
    }
  }, [])

  const observerRef = useCallback((node: HTMLDivElement | null) => {
    if (observerInstanceRef.current) {
      observerInstanceRef.current.disconnect()
      observerInstanceRef.current = null
    }

    if (node) {
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0]
          if (
            entry.isIntersecting &&
            visibleCountRef.current < eventsLengthRef.current &&
            !isPageLoadingRef.current
          ) {
            setIsPageLoading(true)
            setTimeout(() => {
              setVisibleCount((prev) => Math.min(prev + 6, eventsLengthRef.current))
              setIsPageLoading(false)
            }, 600)
          }
        },
        { rootMargin: '150px' }
      )
      observer.observe(node)
      observerInstanceRef.current = observer
    }
  }, [])

  const visibleEvents = filteredEvents.slice(0, visibleCount)

  const handleEventsUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['events'] })
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
      default: return <CakeIcon size={16} weight="bold" />
    }
  }

  return (
    <div className="space-y-6 pt-8">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-2 px-6">
        <h1 className="text-6xl font-bold font-sirage select-none">Events</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="cursor-pointer px-4 rounded-full group flex items-center justify-center gap-2" onClick={() => { haptic.trigger("light"); setCreateModalOpen(true); }}>
            <PlusIcon size={16} weight="bold" className="" />
            Create Event
          </Button>
          <Button className="cursor-pointer rounded-full px-4 bg-black dark:bg-white dark:hover:bg-white/80 group flex items-center justify-center gap-2" onClick={() => { haptic.trigger("light"); setJoinModalOpen(true); }}>
            <Ticket size={16} weight="fill" className="" />
            Join Event
          </Button>
        </div>
      </div>

      {/* Search and Filter Row */}
      <div className="flex items-center flex-wrap gap-2 px-6">
        <div className="flex-1 max-w-md relative">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <Input
              ref={searchInputRef}
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 200)
              }}
              className="pl-9 pr-4 sm:pl-10 sm:pr-12 w-full rounded-full placeholder:text-sm"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 items-center rounded border border-neutral-200 bg-neutral-100 px-1.5 font-mono text-[11px] font-medium text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
              /
            </kbd>
          </div>
          {showSuggestions && searchQuery.trim() !== '' && (
            <div className="absolute top-full mt-2 w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg z-50 overflow-hidden">
              {events
                .filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .slice(0, 5)
                .map((event) => (
                  <div
                    key={event.id}
                    onClick={() => {
                      setSearchQuery(event.name)
                      setShowSuggestions(false)
                    }}
                    className="px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer text-sm flex items-center gap-2"
                  >
                    <span className="truncate">{event.name}</span>
                  </div>
                ))}
                {events.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                  <div className="px-4 py-3 text-sm text-neutral-500">
                    No matching events found.
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Mobile Filters */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => haptic.trigger("light")} className="flex items-center gap-1.5 cursor-pointer">
                <Faders size={16} weight="bold" />
                <span>Filters</span>
                {(searchQuery || dateRange.from || dateRange.to || sortOrder !== 'desc' || roleFilter !== 'ALL') && (
                  <span className="w-2 h-2 rounded-full bg-neutral-900 dark:bg-white" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 rounded-2xl p-1.5">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-semibold px-2.5 pt-1.5 pb-1">
                  Sort
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="cursor-pointer py-2 px-2.5 rounded-lg flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <ArrowsDownUpIcon size={16} />
                    Sort by Date
                  </span>
                  <span className="text-xs text-neutral-500 font-medium font-mono uppercase">
                    {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
                  </span>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-semibold px-2.5 pt-1.5 pb-1">
                  Filter by Date
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => setIsMobileCalendarOpen(true)}
                  className="cursor-pointer py-2 px-2.5 rounded-lg flex items-center gap-2"
                >
                  <CalendarIcon size={16} />
                  <span>
                    {dateRange.from && dateRange.to
                      ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd')}`
                      : 'Filter by Date'
                    }
                  </span>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-semibold px-2.5 pt-1.5 pb-1">
                  Type
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => setRoleFilter('ALL')}
                  className={`cursor-pointer py-2 px-2.5 rounded-lg flex items-center gap-2 ${roleFilter === 'ALL' ? 'bg-neutral-100 dark:bg-neutral-800' : ''}`}
                >
                  <CakeIcon size={16} weight="bold" />
                  All Events
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setRoleFilter('ORGANIZER')}
                  className={`cursor-pointer py-2 px-2.5 rounded-lg flex items-center gap-2 ${roleFilter === 'ORGANIZER' ? 'bg-neutral-100 dark:bg-neutral-800' : ''}`}
                >
                  <Crown size={16} weight="fill" className="text-amber-500" />
                  Organizing
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setRoleFilter('ATTENDEE')}
                  className={`cursor-pointer py-2 px-2.5 rounded-lg flex items-center gap-2 ${roleFilter === 'ATTENDEE' ? 'bg-neutral-100 dark:bg-neutral-800' : ''}`}
                >
                  <User size={16} weight="fill" className="text-blue-500" />
                  Attending
                </DropdownMenuItem>
              </DropdownMenuGroup>

              {(searchQuery || dateRange.from || dateRange.to || sortOrder !== 'desc' || roleFilter !== 'ALL') && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleResetFilters}
                    className="cursor-pointer py-2 px-2.5 rounded-lg flex items-center gap-2 text-red-500 hover:text-red-600 focus:text-red-600"
                  >
                    <Faders size={16} weight="bold" />
                    Reset Filters
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Desktop Filters */}
        <div className="hidden md:flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { haptic.trigger("light"); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <ArrowsDownUpIcon size={16} weight="bold" />
            Sort by Date
          </Button>

          <Popover open={isCalendarOpen} onOpenChange={(open) => { haptic.trigger("light"); setIsCalendarOpen(open); }}>
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

          <Popover open={isRoleFilterOpen} onOpenChange={(open) => { haptic.trigger("light"); setIsRoleFilterOpen(open); }}>
            <PopoverTrigger>
              <Button variant="outline" size="sm" className="flex items-center gap-2 cursor-pointer">
                {getRoleFilterIcon()}
                {getRoleFilterLabel()}
                <CaretDown size={12} weight="bold" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-1 rounded-2xl" align="end">
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
                  <CakeIcon size={16} weight="bold" className="mr-2" />
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
              onClick={() => { haptic.trigger("light"); handleResetFilters(); }}
              className="flex items-center gap-2 text-neutral-500 hover:text-neutral-700 cursor-pointer"
            >
              <Faders size={16} weight="bold" />
              Reset Filters
            </Button>
          )}
        </div>

        <Tabs value={viewMode} onValueChange={(v) => { haptic.trigger("selection"); setViewMode(v as 'grid' | 'list'); }} className="ml-auto">
          <TabsList className="rounded-full h-10 bg-white dark:bg-black border">
            <TabsTrigger value="grid" className="rounded-full px-4 h-8 data-active:bg-white/20 dark:data-active:bg-neutral-900 data-active:shadow-md flex items-center justify-center">
              <SquaresFour size={18} weight={viewMode === 'grid' ? "fill" : "regular"} className="lg:mr-2" />
              <span className='hidden lg:flex'>Grid</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="rounded-full px-4 h-8 data-active:bg-white/20 dark:data-active:bg-neutral-900 data-active:shadow-md flex items-center justify-center">
              <Rows size={18} weight={viewMode === 'list' ? "fill" : "regular"} className="lg:mr-2" />
              <span className='hidden lg:flex'>List</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Events Grid/List */}
      <div className={viewMode === 'grid' 
        ? "grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 px-4 sm:px-6" 
        : "flex flex-col gap-4 px-4 sm:px-6"
      }>
        {visibleEvents.map((event) => (
          viewMode === 'grid' 
            ? <EventCard key={event.id} event={event} />
            : <EventListItem key={event.id} event={event} />
        ))}
      </div>

      {visibleCount < filteredEvents.length ? (
        <div ref={observerRef} className="w-full flex justify-center items-center py-8 pb-24">
          {isPageLoading && (
            <div className="flex flex-col items-center gap-2">
              <CircleNotch size={32} className="animate-spin text-neutral-400 dark:text-neutral-500" />
              <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">Loading more events...</span>
            </div>
          )}
        </div>
      ) : (
        <div className="h-24" />
      )}

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

      {/* Mobile Date Picker Dialog */}
      <Dialog open={isMobileCalendarOpen} onOpenChange={setIsMobileCalendarOpen}>
        <DialogContent className="sm:max-w-sm rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Select Date Range</DialogTitle>
            <DialogDescription>
              Filter events within a range of dates.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <Calendar
              mode="range"
              selected={{
                from: dateRange.from,
                to: dateRange.to
              }}
              onSelect={(range) => {
                setDateRange({ from: range?.from, to: range?.to })
              }}
              numberOfMonths={1}
            />
          </div>
          <DialogFooter className="flex flex-row justify-end gap-2">
            {dateRange.from && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDateRange({ from: undefined, to: undefined })
                  setIsMobileCalendarOpen(false)
                }}
                className="text-red-500 hover:text-red-600 cursor-pointer"
              >
                Clear
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsMobileCalendarOpen(false)}
              className="cursor-pointer"
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Events
