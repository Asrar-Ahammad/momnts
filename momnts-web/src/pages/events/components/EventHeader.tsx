import { useState, useEffect, useRef } from 'react'
import { useConnectionsSummary } from '../../../features/connections/hooks/useConnections'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '../../../components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../../components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog'
import {
  ArrowLeft,
  Upload,
  UsersThree,
  Images,
  User,
  CloudArrowUp,
  Gear,
  MapPin,
  Calendar,
  Check,
  CopySimpleIcon,
  DownloadSimple,
  Selection,
  X,
  Users,
  SignOut,
  SortAscending,
  SortDescending,
  LinkSimple,
  Heart
} from '@phosphor-icons/react'
import { EventData } from '../../../features/events/services/events.api'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

type TabType = 'all' | 'your-photos' | 'favourites' | 'your-uploads' | 'connections'

interface EventHeaderProps {
  event: EventData | null
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  onBack: () => void
  onUploadClick: () => void
  onSettingsClick: () => void
  inviteCodeCopied: boolean
  onCopyInviteCode: () => void
  photoCount: number
  isSelectMode: boolean
  onToggleSelectMode: () => void
  selectedCount: number
  onDownloadSelected: () => void
  onAttendeesClick: () => void
  userUploadCount: number
  sortOrder: 'desc' | 'asc'
  onToggleSort: () => void
  onLeaveEvent?: () => Promise<void>
  onDownloadFavourites?: () => void
  favouritesCount?: number
}

const EventHeader = ({
  event,
  activeTab,
  onTabChange,
  onBack,
  onUploadClick,
  onSettingsClick,
  inviteCodeCopied,
  onCopyInviteCode,
  isSelectMode,
  onToggleSelectMode,
  selectedCount,
  onDownloadSelected,
  onAttendeesClick,
  userUploadCount,
  sortOrder,
  onToggleSort,
  onLeaveEvent,
  onDownloadFavourites,
  favouritesCount = 0
}: EventHeaderProps) => {
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [leaving, setLeaving] = useState(false)
  // TODO: Add error handling for this hook
  const { data: summaryData } = useConnectionsSummary(event?.id ?? '')

  const handleLeave = async () => {
    if (!onLeaveEvent) return
    try {
      setLeaving(true)
      await onLeaveEvent()
    } finally {
      setLeaving(false)
      setShowLeaveConfirm(false)
    }
  }
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const [visible, setVisible] = useState(true)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target
      if (!(target instanceof HTMLElement)) return

      const currentScrollY = target.scrollTop

      // Always show header at the top
      if (currentScrollY < 10) {
        setVisible(true)
        lastScrollY.current = currentScrollY
        return
      }

      // Check if scroll difference is significant to avoid micro-adjustments
      if (Math.abs(currentScrollY - lastScrollY.current) < 5) {
        return
      }

      if (currentScrollY > lastScrollY.current) {
        // Scrolling down -> hide header
        setVisible(false)
      } else {
        // Scrolling up -> show header
        setVisible(true)
      }

      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, true)
    return () => {
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [])

  return (
    <>
      <div className={`sticky top-0 z-30 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 transition-all duration-300 ease-in-out ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-4">
          
          {/* Row 1: Title Section (Left) & Actions Section (Right) */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full">
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <Tooltip>
                <TooltipTrigger delay={0} asChild>
                  <Button className="cursor-pointer shrink-0" variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft size={20} weight="bold" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Go to Events</p>
                </TooltipContent>
              </Tooltip>

              <div className="flex-1 min-w-0">
                <h1 className="text-3xl sm:text-4xl lg:text-4xl font-bold font-sirage capitalize mb-2 truncate">
                  {event?.name || 'Loading...'}
                </h1>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] sm:text-sm text-neutral-500">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MapPin size={14} className="shrink-0" />
                    <span className="capitalize truncate">{event?.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Calendar size={14} />
                    <span>{event?.date ? formatDate(event.date) : ''}</span>
                  </div>

                  {event?.user_role === 'ORGANIZER' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Badge
                          variant="outline"
                          className="cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 h-7 px-2 text-xs flex items-center gap-1.5 border-neutral-200 dark:border-neutral-700"
                        >
                          {inviteCodeCopied ? <Check size={12} className="text-green-500" /> : <CopySimpleIcon size={12} />}
                          <span className="font-mono">{event?.invite_code}</span>
                        </Badge>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-40 rounded-2xl">
                        <DropdownMenuItem onClick={onCopyInviteCode} className="cursor-pointer py-2">
                          <CopySimpleIcon size={16} className="mr-2" />
                          Copy Code
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={async () => {
                          const url = `${window.location.origin}/events?joinCode=${event?.invite_code}`
                          try {
                            await navigator.clipboard.writeText(url)
                            toast.success('Invite link copied!')
                          } catch (err) {
                            toast.error('Failed to copy invite link')
                          }
                        }} className="cursor-pointer py-2">
                          <LinkSimple size={16} className="mr-2" />
                          Copy Link
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </div>

            {/* Right Action Section */}
            <motion.div
              layout
              className="flex items-center justify-start lg:justify-end gap-2 sm:gap-3 overflow-x-auto no-scrollbar pb-1 w-full lg:w-auto shrink-0"
            >
              {/* Default view buttons */}
              {!isSelectMode ? (
                <motion.div layout className="flex items-center gap-2 w-full lg:w-auto">
                  <AnimatePresence mode="popLayout">
                    {/* Sort and Select buttons (not shown on connections tab) */}
                    {activeTab !== 'connections' && (
                      <motion.div
                        key="sort-select-controls"
                        initial={{ opacity: 0, scale: 0.8, x: -15 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8, x: -15 }}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        className="flex items-center gap-2 shrink-0"
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              className="h-10 w-10 sm:w-auto sm:px-4 flex items-center justify-center gap-2 rounded-xl"
                              onClick={onToggleSort}
                            >
                              {sortOrder === 'desc' ? <SortDescending size={18} weight="bold" /> : <SortAscending size={18} weight="bold" />}
                              <span className="hidden sm:inline">Sort</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="sm:hidden">Sort Photos</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              className="h-10 w-10 sm:w-auto sm:px-4 flex items-center justify-center gap-2 rounded-xl"
                              onClick={onToggleSelectMode}
                            >
                              <Selection size={18} weight="bold" />
                              <span className="hidden sm:inline">Select</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="sm:hidden">Select Photos</TooltipContent>
                        </Tooltip>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Organizer-only buttons */}
                  {event?.user_role === 'ORGANIZER' && (
                    <motion.div layout className="flex items-center gap-2 shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            className="h-10 w-10 sm:w-auto sm:px-4 flex items-center justify-center gap-2 rounded-xl"
                            onClick={onAttendeesClick}
                          >
                            <Users size={18} weight="bold" />
                            <span className="hidden sm:inline">Attendees</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="sm:hidden">View Attendees</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            className="h-10 w-10 sm:w-auto sm:px-4 flex items-center justify-center gap-2 rounded-xl"
                            onClick={onSettingsClick}
                          >
                            <Gear size={18} weight="bold" />
                            <span className="hidden sm:inline">Settings</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="sm:hidden">Event Settings</TooltipContent>
                      </Tooltip>
                    </motion.div>
                  )}

                  {/* Attendee-only buttons */}
                  {event?.user_role === 'ATTENDEE' && (
                    <motion.div layout>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            className="h-10 w-10 sm:w-auto sm:px-4 flex items-center justify-center gap-2 rounded-xl text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-red-900 dark:hover:bg-red-950"
                            onClick={() => setShowLeaveConfirm(true)}
                          >
                            <SignOut size={18} weight="bold" />
                            <span className="hidden sm:inline">Leave</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="sm:hidden">Leave Event</TooltipContent>
                      </Tooltip>
                    </motion.div>
                  )}

                  {/* Main action button (Upload/Download) */}
                  <motion.div layout className="flex-1 sm:flex-none">
                    {(() => {
                      // Favourites tab: Download Favourites
                      if (activeTab === 'favourites') {
                        return (
                          <Button
                            className="flex-1 sm:flex-none w-full h-10 px-6 sm:px-8 flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors"
                            onClick={onDownloadFavourites}
                            disabled={favouritesCount === 0}
                          >
                            <DownloadSimple size={18} weight="bold" />
                            <span className="hidden sm:inline">Download Favourites</span>
                            <span className="inline sm:hidden">Download</span>
                            {favouritesCount > 0 && (
                              <span className="bg-white/20 px-2 py-0.5 rounded-full text-[11px] font-semibold">{favouritesCount}</span>
                            )}
                          </Button>
                        )
                      }

                      const isInactiveAttendee = !event?.is_active && event?.user_role !== 'ORGANIZER'
                      const isLimitReached = event?.user_role === 'ATTENDEE' && userUploadCount >= (event?.attendee_upload_limit || 0)

                      // Event inactive: Upload disabled
                      if (isInactiveAttendee) {
                        return (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="w-full">
                                <Button
                                  className="w-full h-10 px-6 sm:px-8 flex items-center justify-center gap-2 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed"
                                  disabled
                                >
                                  <Upload size={18} weight="bold" />
                                  <span className="hidden sm:inline">Upload Photos</span>
                                  <span className="inline sm:hidden">Upload</span>
                                </Button>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Event is inactive. Uploads are disabled.</p>
                            </TooltipContent>
                          </Tooltip>
                        )
                      }

                      // Upload limit reached: Upload disabled
                      if (isLimitReached) {
                        return (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="w-full">
                                <Button
                                  className="w-full h-10 px-6 sm:px-8 flex items-center justify-center gap-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border border-neutral-200 dark:border-neutral-700 cursor-not-allowed"
                                  disabled
                                >
                                  <Upload size={18} weight="bold" />
                                  <span className="hidden sm:inline">Upload Limit Reached</span>
                                  <span className="inline sm:hidden">Limit Reached</span>
                                </Button>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>You have reached your limit of {event?.attendee_upload_limit} photos.</p>
                            </TooltipContent>
                          </Tooltip>
                        )
                      }

                      // Default: Upload Photos
                      return (
                        <Button
                          className="w-full h-10 px-6 sm:px-8 flex items-center justify-center gap-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 transition-opacity"
                          onClick={onUploadClick}
                        >
                          <Upload size={18} weight="bold" />
                          <span className="hidden sm:inline">Upload Photos</span>
                          <span className="inline sm:hidden">Upload</span>
                        </Button>
                      )
                    })()}
                  </motion.div>
                </motion.div>
              ) : (
                // Select mode buttons
                <motion.div layout className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                  <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mr-auto sm:mr-0 px-2">
                    {selectedCount} <span className="hidden sm:inline">selected</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={onDownloadSelected}
                      disabled={selectedCount === 0}
                      className="flex items-center justify-center gap-2 h-10 px-4 sm:px-6 rounded-xl"
                    >
                      <DownloadSimple size={18} weight="bold" />
                      <span className="hidden sm:inline">Download</span>
                      {selectedCount > 0 && <span className="sm:hidden">({selectedCount})</span>}
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={onToggleSelectMode}
                      className="h-10 w-10 sm:w-auto sm:px-4 flex items-center justify-center gap-2 rounded-xl"
                    >
                      <X size={18} weight="bold" />
                      <span className="hidden sm:inline">Cancel</span>
                    </Button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Row 2: Tabs (Full Width) */}
          <div className="mt-2 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar border-t border-neutral-100 dark:border-neutral-800/60 pt-3">
            <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as TabType)} className="w-full">
              <TabsList className="bg-neutral-100 dark:bg-neutral-800 w-max min-w-full sm:w-auto flex shrink-0 rounded-full p-1 relative">
                {(['all', 'your-photos', 'favourites', 'your-uploads', 'connections'] as TabType[]).map((tab) => {
                  const isActive = activeTab === tab;
                  return (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className={`relative flex items-center gap-2 whitespace-nowrap px-3 sm:px-4 py-2 rounded-full z-10 transition-colors ${isActive ? 'text-neutral-900 dark:text-neutral-100 data-active:bg-transparent dark:data-active:bg-transparent shadow-none data-active:shadow-none' : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300'}`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="tab-indicator"
                          className="absolute inset-0 bg-white dark:bg-neutral-900 rounded-full shadow-sm -z-10"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                        />
                      )}
                      {tab === 'all' && <Images size={16} className="z-10" />}
                      {tab === 'your-photos' && <User size={16} className="z-10" />}
                      {tab === 'favourites' && <Heart size={16} className="z-10 text-rose-500" weight="fill" />}
                      {tab === 'your-uploads' && <CloudArrowUp size={16} className="z-10" />}
                      {tab === 'connections' && <UsersThree size={16} className="z-10" />}
                      <span className="hidden sm:inline z-10">
                        {tab === 'all' ? 'All Photos' : tab === 'your-photos' ? 'Your Photos' : tab === 'favourites' ? 'Favourites' : tab === 'your-uploads' ? 'Your Uploads' : 'Who was I with?'}
                      </span>
                      {tab === 'connections' && (summaryData?.total_people ?? 0) > 0 && (
                        <span className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none z-10">
                          {summaryData!.total_people}
                        </span>
                      )}
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </Tabs>
          </div>

        </div>
      </div>

      {/* Leave Event Confirmation */}
      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent className="rounded-3xl border-neutral-200 dark:border-neutral-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Leave Event</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove you from <span className="font-semibold text-neutral-900 dark:text-neutral-100 capitalize">{event?.name}</span>. All photos you uploaded will be permanently deleted and your face matches will be cleared. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl" disabled={leaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeave}
              disabled={leaving}
              className="bg-red-500 hover:bg-red-600 text-white rounded-2xl"
            >
              {leaving ? 'Leaving...' : 'Leave Event'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default EventHeader
