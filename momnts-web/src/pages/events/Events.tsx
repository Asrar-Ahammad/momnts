import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
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
  ArrowsDownUpIcon,
  CalendarBlank,
} from '@phosphor-icons/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '../../components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('momnts_events_viewMode') as 'grid' | 'list') || 'grid'
  })

  useEffect(() => {
    localStorage.setItem('momnts_events_viewMode', viewMode)
  }, [viewMode])

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
      case 'ORGANIZER': return <Crown size={13} weight="bold" />
      case 'ATTENDEE': return <User size={13} weight="bold" />
      default: return <CakeIcon size={13} weight="bold" />
    }
  }

  const hasActiveFilters = !!(searchQuery || dateRange.from || dateRange.to || sortOrder !== 'desc' || roleFilter !== 'ALL')

  return (
    <div className="pt-7 pb-24 space-y-5">

      {/* ════════════════════════════════════════════════════
          PAGE HEADER
         ════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-5 sm:px-6">
        <div>
          <h1 className="text-5xl sm:text-6xl font-bold font-sirage select-none tracking-tight leading-none">
            Events
          </h1>
          {!loading && (
            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-2 font-medium tabular-nums">
              {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
              {hasActiveFilters && ' · filtered'}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => { haptic.trigger("light"); setCreateModalOpen(true) }}
            className="ev-cta-secondary flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold cursor-pointer"
          >
            <PlusIcon size={14} weight="bold" />
            <span>Create Event</span>
          </button>
          <button
            onClick={() => { haptic.trigger("light"); setJoinModalOpen(true) }}
            className="ev-cta-primary flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold cursor-pointer"
          >
            <Ticket size={14} weight="fill" />
            <span>Join Event</span>
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          FILTER BAR
         ════════════════════════════════════════════════════ */}
      <div className="px-5 sm:px-6">
        <div className="flex items-center gap-2 flex-wrap">

          {/* Search */}
          <div className="flex-1 min-w-[120px] max-w-xs relative ev-search rounded-full">
            <MagnifyingGlassIcon
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400 pointer-events-none"
              size={15}
            />
            <Input
              ref={searchInputRef}
              placeholder="Search events…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="pl-8 pr-9 h-9 bg-transparent border-0 shadow-none rounded-full
                placeholder:text-neutral-500 dark:placeholder:text-neutral-500 text-sm focus-visible:ring-0"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 items-center rounded border border-neutral-700 dark:border-neutral-700 px-1.5 font-mono text-[10px] font-medium text-neutral-500">
              /
            </kbd>
            {/* Suggestions */}
            {showSuggestions && searchQuery.trim() !== '' && (
              <div className="absolute top-full mt-1.5 w-full bg-neutral-900 dark:bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                {events
                  .filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .slice(0, 5)
                  .map((event) => (
                    <div
                      key={event.id}
                      onClick={() => { setSearchQuery(event.name); setShowSuggestions(false) }}
                      className="px-4 py-2.5 hover:bg-neutral-800 cursor-pointer text-sm text-neutral-200 transition-colors flex items-center gap-2"
                    >
                      <MagnifyingGlassIcon size={13} className="text-neutral-500 shrink-0" />
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

          {/* ── Mobile: single Filters dropdown ─────────── */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={() => haptic.trigger("light")}
                  className={`ev-pill flex items-center gap-1.5 h-9 px-3.5 rounded-full text-sm font-medium cursor-pointer text-neutral-700 dark:text-neutral-300 ${hasActiveFilters ? 'ev-pill-active' : ''}`}
                >
                  <Faders size={14} weight="bold" />
                  Filters
                  {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-white/60" />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 rounded-2xl p-1.5">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-semibold px-2.5 pt-1.5 pb-1">Sort</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="cursor-pointer py-2 px-2.5 rounded-lg flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2"><ArrowsDownUpIcon size={14} />Sort by Date</span>
                    <span className="text-xs text-neutral-500 font-medium font-mono uppercase">{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-semibold px-2.5 pt-1.5 pb-1">Filter by Date</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => setIsMobileCalendarOpen(true)}
                    className="cursor-pointer py-2 px-2.5 rounded-lg flex items-center gap-2"
                  >
                    <CalendarIcon size={14} />
                    <span>{dateRange.from && dateRange.to ? `${format(dateRange.from, 'MMM dd')} – ${format(dateRange.to, 'MMM dd')}` : 'Filter by Date'}</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-semibold px-2.5 pt-1.5 pb-1">Type</DropdownMenuLabel>
                  {(['ALL', 'ORGANIZER', 'ATTENDEE'] as const).map(r => (
                    <DropdownMenuItem
                      key={r}
                      onClick={() => setRoleFilter(r)}
                      className={`cursor-pointer py-2 px-2.5 rounded-lg flex items-center gap-2 ${roleFilter === r ? 'bg-neutral-100 dark:bg-neutral-800' : ''}`}
                    >
                      {r === 'ALL' && <CakeIcon size={14} weight="bold" />}
                      {r === 'ORGANIZER' && <Crown size={14} weight="fill" className="text-amber-500" />}
                      {r === 'ATTENDEE' && <User size={14} weight="fill" className="text-blue-500" />}
                      {r === 'ALL' ? 'All Events' : r === 'ORGANIZER' ? 'Organizing' : 'Attending'}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>

                {hasActiveFilters && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleResetFilters}
                      className="cursor-pointer py-2 px-2.5 rounded-lg flex items-center gap-2 text-red-500 hover:text-red-600 focus:text-red-600"
                    >
                      <Faders size={14} weight="bold" />
                      Reset Filters
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* ── Desktop filter pills ─────────────────────── */}
          <div className="hidden md:flex items-center gap-2">
            {/* Sort */}
            <motion.button
              whileTap={{ scale: 0.94 }}
              whileHover={{ scale: 1.03 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              onClick={() => { haptic.trigger("light"); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc') }}
              className="ev-pill flex items-center gap-1.5 h-9 px-3.5 rounded-full text-sm font-medium cursor-pointer text-neutral-700 dark:text-neutral-300"
            >
              <ArrowsDownUpIcon size={13} weight="bold" />
              <span>{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
            </motion.button>

            {/* Date filter */}
            <Popover open={isCalendarOpen} onOpenChange={(open) => { haptic.trigger("light"); setIsCalendarOpen(open) }}>
              <PopoverTrigger asChild>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  whileHover={{ scale: 1.03 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className={`ev-pill flex items-center gap-1.5 h-9 px-3.5 rounded-full text-sm font-medium cursor-pointer text-neutral-700 dark:text-neutral-300 ${dateRange.from ? 'ev-pill-active' : ''}`}>
                  <CalendarBlank size={13} weight="bold" />
                  <span>{dateRange.from && dateRange.to ? `${format(dateRange.from, 'MMM dd')} – ${format(dateRange.to, 'MMM dd')}` : 'Date'}</span>
                </motion.button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            {/* Role filter */}
            <Popover open={isRoleFilterOpen} onOpenChange={(open) => { haptic.trigger("light"); setIsRoleFilterOpen(open) }}>
              <PopoverTrigger asChild>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  whileHover={{ scale: 1.03 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className={`ev-pill flex items-center gap-1.5 h-9 px-3.5 rounded-full text-sm font-medium cursor-pointer text-neutral-700 dark:text-neutral-300 ${roleFilter !== 'ALL' ? 'ev-pill-active' : ''}`}>
                  {getRoleFilterIcon()}
                  <span>{getRoleFilterLabel()}</span>
                  <CaretDown size={11} weight="bold" className="text-neutral-500" />
                </motion.button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-1 rounded-2xl" align="end">
                <div className="flex flex-col gap-0.5">
                  {(['ALL', 'ORGANIZER', 'ATTENDEE'] as const).map(r => (
                    <Button key={r} variant={roleFilter === r ? 'default' : 'ghost'} size="sm" onClick={() => { setRoleFilter(r); setIsRoleFilterOpen(false) }} className="justify-start cursor-pointer">
                      {r === 'ALL' && <CakeIcon size={13} weight="bold" className="mr-2" />}
                      {r === 'ORGANIZER' && <Crown size={13} weight="fill" className="mr-2" />}
                      {r === 'ATTENDEE' && <User size={13} weight="fill" className="mr-2" />}
                      {r === 'ALL' ? 'All Events' : r === 'ORGANIZER' ? 'Organizing' : 'Attending'}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Reset */}
            {hasActiveFilters && (
              <motion.button
                whileTap={{ scale: 0.94 }}
                whileHover={{ scale: 1.03 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                onClick={() => { haptic.trigger("light"); handleResetFilters() }}
                className="flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-medium cursor-pointer
                  text-neutral-500 hover:text-red-500 dark:hover:text-red-400
                  hover:bg-red-500/8 dark:hover:bg-red-500/10 transition-all duration-200"
              >
                <Faders size={13} weight="bold" />
                Reset
              </motion.button>
            )}
          </div>

          {/* ── View toggle — sliding pill indicator ─────── */}
          <div className="ml-auto flex items-center ev-toggle-wrap rounded-full p-0.5 relative">
            {/* Sliding background pill — animates between Grid/List */}
            <motion.div
              className="absolute inset-y-0.5 rounded-full ev-toggle-active z-0"
              layoutId="ev-toggle-bg"
              layout
              style={{ left: viewMode === 'grid' ? '2px' : '50%', right: viewMode === 'list' ? '2px' : '50%' }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
            <motion.button
              onClick={() => { haptic.trigger("selection"); setViewMode('grid') }}
              whileTap={{ scale: 0.93 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className={`relative z-10 flex items-center gap-1.5 h-8 px-3.5 rounded-full text-sm font-medium cursor-pointer transition-colors duration-200
                ${viewMode === 'grid' ? 'text-neutral-900 dark:text-neutral-50' : 'text-neutral-500 dark:text-neutral-500'}`}
            >
              <SquaresFour size={16} weight={viewMode === 'grid' ? 'fill' : 'regular'} />
              <span className="hidden lg:inline">Grid</span>
            </motion.button>
            <motion.button
              onClick={() => { haptic.trigger("selection"); setViewMode('list') }}
              whileTap={{ scale: 0.93 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className={`relative z-10 flex items-center gap-1.5 h-8 px-3.5 rounded-full text-sm font-medium cursor-pointer transition-colors duration-200
                ${viewMode === 'list' ? 'text-neutral-900 dark:text-neutral-50' : 'text-neutral-500 dark:text-neutral-500'}`}
            >
              <Rows size={16} weight={viewMode === 'list' ? 'fill' : 'regular'} />
              <span className="hidden lg:inline">List</span>
            </motion.button>
          </div>

        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          LOADING SKELETON
         ════════════════════════════════════════════════════ */}
      {loading && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 px-5 sm:px-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="w-full aspect-square sm:aspect-video rounded-2xl sm:rounded-[26px]
                bg-neutral-800/50 animate-pulse"
              style={{ animationDelay: `${i * 70}ms` }}
            />
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          GRID / LIST
         ════════════════════════════════════════════════════ */}
      {!loading && filteredEvents.length > 0 && (
        <div className={viewMode === 'grid'
          ? "grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 px-5 sm:px-6"
          : "flex flex-col gap-2 px-5 sm:px-6"
        }>
          {visibleEvents.map((event, i) => (
            viewMode === 'grid'
              ? <EventCard key={event.id} event={event} index={i} />
              : <EventListItem key={event.id} event={event} index={i} />
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {visibleCount < filteredEvents.length ? (
        <div ref={observerRef} className="w-full flex justify-center items-center py-8">
          {isPageLoading && (
            <div className="flex flex-col items-center gap-2">
              <CircleNotch size={28} className="animate-spin text-neutral-400 dark:text-neutral-600" />
              <span className="text-xs text-neutral-500 font-medium">Loading more…</span>
            </div>
          )}
        </div>
      ) : (
        <div className="h-6" />
      )}

      {/* ════════════════════════════════════════════════════
          EMPTY STATE
         ════════════════════════════════════════════════════ */}
      {!loading && filteredEvents.length === 0 && (
        <div className="px-5 sm:px-6">
          <div className="ev-empty rounded-3xl py-20 flex flex-col items-center gap-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-neutral-800/60 flex items-center justify-center">
              <CakeIcon size={28} className="text-neutral-500" weight="thin" />
            </div>
            <div>
              <p className="text-base font-semibold text-neutral-200 dark:text-neutral-200">
                {searchQuery || dateRange.from ? 'No events match your filters' : 'No events yet'}
              </p>
              <p className="text-sm text-neutral-500 mt-1">
                {searchQuery || dateRange.from
                  ? 'Try a different search or clear your filters.'
                  : 'Create an event or join one with an invite code.'}
              </p>
            </div>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="ev-cta-secondary px-5 py-2 rounded-full text-sm font-semibold cursor-pointer"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          MODALS
         ════════════════════════════════════════════════════ */}
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
            <DialogDescription>Filter events within a range of dates.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
              numberOfMonths={1}
            />
          </div>
          <DialogFooter className="flex flex-row justify-end gap-2">
            {dateRange.from && (
              <Button
                variant="ghost" size="sm"
                onClick={() => { setDateRange({ from: undefined, to: undefined }); setIsMobileCalendarOpen(false) }}
                className="text-red-500 hover:text-red-600 cursor-pointer"
              >
                Clear
              </Button>
            )}
            <Button variant="default" size="sm" onClick={() => setIsMobileCalendarOpen(false)} className="cursor-pointer">
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Events
