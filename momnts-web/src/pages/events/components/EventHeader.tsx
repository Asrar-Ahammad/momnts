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
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
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
  Heart,
  Columns,
  SquaresFour,
  DotsThree,
  MusicNotes,
  DownloadSimpleIcon,
  ShareNetwork,
  Lock,
  Globe,
  SquareIcon,
} from '@phosphor-icons/react'
import { EventData } from '../../../features/events/services/events.api'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { useWebHaptics } from 'web-haptics/react'

type TabType = 'all' | 'your-photos' | 'favourites' | 'your-uploads' | 'connections'
type GalleryColumns = 1 | 2 | 3

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
  galleryColumns?: GalleryColumns
  onGalleryColumnsChange?: (cols: GalleryColumns) => void
  onMemoryLaneClick?: () => void
  onSelectAll?: () => void
  isAllSelected?: boolean
  onShareClick?: () => void
  pendingRequestCount?: number
  onForgetDeviceKeys?: () => void
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
  favouritesCount = 0,
  galleryColumns = 1,
  onGalleryColumnsChange,
  pendingRequestCount = 0,
  onMemoryLaneClick,
  onSelectAll,
  isAllSelected = false,
  onShareClick,
  onForgetDeviceKeys
}: EventHeaderProps) => {
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const leavingRef = useRef(false)
  const haptic = useWebHaptics()
  // TODO: Add error handling for this hook
  const { data: summaryData } = useConnectionsSummary(event?.id ?? '', event?.encryption_mode !== 'E2EE')

  const handleLeave = async () => {
    if (!onLeaveEvent || leavingRef.current) return
    try {
      leavingRef.current = true
      setLeaving(true)
      await onLeaveEvent()
    } finally {
      leavingRef.current = false
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

      // Only react to the main scroll container (<main> element) or document scroll
      const isMainScroll = target === document ||
        (target instanceof HTMLElement && target.tagName.toLowerCase() === 'main')

      if (!isMainScroll) return

      let currentScrollY = 0
      if (target instanceof HTMLDocument) {
        currentScrollY = window.scrollY || document.documentElement.scrollTop
      } else if (target instanceof HTMLElement) {
        currentScrollY = target.scrollTop
      }

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

  const isOrganizer = event?.user_role === 'ORGANIZER'
  const isAttendee = event?.user_role === 'ATTENDEE'
  const showGalleryActions = activeTab !== 'connections'

  // Shared CTA button (Upload / Download Favourites)
  const renderCTA = (fullWidth = false) => {
    // Favourites tab: Download Favourites
    if (activeTab === 'favourites') {
      const showDownload = isOrganizer || event?.allow_downloads
      if (!showDownload) {
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={fullWidth ? 'w-full' : ''}>
                <Button
                  className={`${fullWidth ? 'flex-1 w-full' : ''} h-8 sm:h-9 lg:h-10 px-2.5 sm:px-4 lg:px-8 flex items-center justify-center gap-1 sm:gap-1.5 lg:gap-2 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed text-[11px] sm:text-xs lg:text-sm shrink-0 whitespace-nowrap`}
                  disabled
                >
                  <DownloadSimple size={18} weight="bold" className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-[18px] lg:h-[18px]" />
                  <span className="hidden sm:inline">Downloads Disabled</span>
                  <span className="inline sm:hidden">Disabled</span>
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Organizer has disabled photo downloads for attendees.</p>
            </TooltipContent>
          </Tooltip>
        )
      }
      return (
        <Button
          className={`${fullWidth ? 'flex-1 w-full' : ''} h-8 sm:h-9 lg:h-10 px-2.5 sm:px-4 lg:px-8 flex items-center justify-center gap-1 sm:gap-1.5 lg:gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors text-[11px] sm:text-xs lg:text-sm shrink-0 whitespace-nowrap`}
          onClick={() => { haptic.trigger("light"); onDownloadFavourites?.(); }}
          disabled={favouritesCount === 0}
        >
          <DownloadSimple size={18} weight="bold" className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-[18px] lg:h-[18px]" />
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

    if (isInactiveAttendee) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={fullWidth ? 'w-full' : ''}>
              <Button
                className={`${fullWidth ? 'w-full' : ''} h-8 sm:h-9 lg:h-10 px-2.5 sm:px-4 lg:px-8 flex items-center justify-center gap-1 sm:gap-1.5 lg:gap-2 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed text-[11px] sm:text-xs lg:text-sm shrink-0 whitespace-nowrap`}
                disabled
              >
                <Upload size={18} weight="bold" className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-[18px] lg:h-[18px]" />
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

    if (isLimitReached) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={fullWidth ? 'w-full' : ''}>
              <Button
                className={`${fullWidth ? 'w-full' : ''} h-8 sm:h-9 lg:h-10 px-2.5 sm:px-4 lg:px-8 flex items-center justify-center gap-1 sm:gap-1.5 lg:gap-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border border-neutral-200 dark:border-neutral-700 cursor-not-allowed text-[11px] sm:text-xs lg:text-sm shrink-0 whitespace-nowrap`}
                disabled
              >
                <Upload size={18} weight="bold" className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-[18px] lg:h-[18px]" />
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

    return (
      <Button
        className={`${fullWidth ? 'w-full' : ''} h-8 sm:h-9 lg:h-10 px-2.5 sm:px-4 lg:px-8 flex items-center justify-center gap-1 sm:gap-1.5 lg:gap-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-[11px] sm:text-xs lg:text-sm font-semibold shrink-0 whitespace-nowrap`}
        onClick={() => { haptic.trigger("light"); onUploadClick(); }}
      >
        <Upload size={18} weight="bold" className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-[18px] lg:h-[18px]" />
        <span className="hidden sm:inline">Upload Photos</span>
        <span className="inline sm:hidden">Upload</span>
      </Button>
    )
  }

  return (
    <>
      <div className={`sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border transition-all duration-300 ease-in-out ${visible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-4">

          {/* Row 1: Title Section (Left) & Actions Section (Right) */}
          <div className="flex flex-wrap items-center justify-between gap-4 w-full">
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-[200px]">
              <Tooltip>
                <TooltipTrigger delay={0} asChild>
                  <Button className="cursor-pointer shrink-0" variant="ghost" size="icon" onClick={() => { haptic.trigger("light"); onBack(); }}>
                    <ArrowLeft size={20} weight="bold" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Go to Events</p>
                </TooltipContent>
              </Tooltip>

              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-sirage capitalize mb-1 sm:mb-2 flex items-center gap-2 truncate">
                  <span className="truncate">{event?.name || 'Loading...'}</span>
                  {event && (
                    event.encryption_mode === 'E2EE' ? (
                      <Badge className="bg-purple-600 hover:bg-purple-700 text-white border-0 flex items-center gap-1 py-1 px-2.5 rounded-full shadow-md shrink-0 select-none">
                        <Lock size={12} weight="fill" />
                        <span className="text-[10px] font-bold tracking-wider">E2EE</span>
                      </Badge>
                    ) : event.is_secure ? (
                      <Lock size={22} weight="fill" className="text-amber-500 shrink-0" />
                    ) : (
                      <Globe size={22} className="text-neutral-400 dark:text-neutral-500 shrink-0" />
                    )
                  )}
                </h1>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] sm:text-sm text-neutral-500">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MapPin size={14} className="shrink-0" />
                    <span className="capitalize truncate">{event?.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Calendar size={14} />
                    <span>{event?.date ? formatDate(event.date) : ''}</span>
                  </div>

                  {/* Desktop: Invite code badge */}
                  {isOrganizer && (
                    <div className="hidden sm:block">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Badge
                            variant="outline"
                            onClick={() => haptic.trigger("light")}
                            className="cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 h-7 px-2.5 text-xs flex items-center gap-1.5 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300"
                          >
                            <ShareNetwork size={14} />
                            <span className="font-medium">Share</span>
                          </Badge>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48 rounded-2xl p-1.5">
                          <DropdownMenuItem onClick={() => { haptic.trigger("light"); onShareClick?.(); }} className="cursor-pointer py-2 text-neutral-600 dark:text-neutral-400 font-medium">
                            <ShareNetwork size={16} className="mr-2.5" />
                            Share Event & QR
                          </DropdownMenuItem>
                          {event?.encryption_mode === 'E2EE' ? (
                            <>
                              <DropdownMenuItem onClick={async () => {
                                haptic.trigger("success")
                                try {
                                  await navigator.clipboard.writeText(event.invite_code)
                                  toast.success('Event code copied!')
                                } catch {
                                  toast.error('Failed to copy event code')
                                }
                              }} className="cursor-pointer py-2 text-neutral-600 dark:text-neutral-400">
                                <CopySimpleIcon size={16} className="mr-2.5 text-neutral-500" />
                                Copy Code
                                <span className="ml-auto font-mono text-[10px] text-neutral-400">{event?.invite_code}</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={async () => {
                                haptic.trigger("success")
                                const passphrase = sessionStorage.getItem('passphrase_' + event.id) || ''
                                if (passphrase) {
                                  try {
                                    await navigator.clipboard.writeText(passphrase)
                                    toast.success('Passphrase copied!')
                                  } catch {
                                    toast.error('Failed to copy passphrase')
                                  }
                                } else {
                                  toast.error('Passphrase not cached in this session.')
                                }
                              }} className="cursor-pointer py-2 text-neutral-600 dark:text-neutral-400">
                                <Lock size={16} className="mr-2.5 text-neutral-500" />
                                Copy Passphrase
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem onClick={() => { haptic.trigger("success"); onCopyInviteCode(); }} className="cursor-pointer py-2 text-neutral-600 dark:text-neutral-400">
                              <CopySimpleIcon size={16} className="mr-2.5" />
                              Copy Code
                              <span className="ml-auto font-mono text-[10px] text-neutral-400">{event?.invite_code}</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={async () => {
                            haptic.trigger("success")
                            const url = `${window.location.origin}/events?joinCode=${event?.invite_code}`
                            try {
                              await navigator.clipboard.writeText(url)
                              toast.success('Invite link copied!')
                            } catch (err) {
                              toast.error('Failed to copy invite link')
                            }
                          }} className="cursor-pointer py-2 text-neutral-600 dark:text-neutral-400">
                            <LinkSimple size={16} className="mr-2.5" />
                            Copy Link
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Action Section */}
            <motion.div
              layout
              className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-3 overflow-x-auto no-scrollbar py-2 -my-2 px-1 -mx-1 w-full lg:w-auto shrink-0 pl-[38px] sm:pl-10 lg:pl-0"
            >
              {!isSelectMode ? (
                <motion.div layout className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 w-full lg:w-auto">
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key="gallery-controls"
                      initial={{ opacity: 0, scale: 0.8, x: -15 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.8, x: -15 }}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      className="flex items-center gap-2 shrink-0 order-2 sm:order-none"
                    >
                      {/* ═══ MOBILE: Consolidated menu ═══ */}
                      <div className="sm:hidden">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              onClick={() => haptic.trigger("light")}
                              className="h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10 flex items-center justify-center rounded-xl cursor-pointer"
                            >
                              <DotsThree size={20} weight="bold" className="w-4 h-4 sm:w-[18px] sm:h-[18px] lg:w-5 lg:h-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-64 rounded-2xl p-1.5">

                            {/* Gallery section */}
                            {showGalleryActions && (
                              <DropdownMenuGroup>
                                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-semibold px-2 pt-1.5 pb-1">
                                  Gallery
                                </DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => { haptic.trigger("light"); onToggleSort(); }}
                                  className="cursor-pointer py-2.5 px-2.5 rounded-lg"
                                >
                                  {sortOrder === 'desc'
                                    ? <SortDescending size={16} className="mr-2.5 text-neutral-500" />
                                    : <SortAscending size={16} className="mr-2.5 text-neutral-500" />
                                  }
                                  <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
                                  <span className="ml-auto text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">
                                    Sort
                                  </span>
                                </DropdownMenuItem>

                                {showGalleryActions && (isOrganizer || event?.allow_downloads) && (
                                  <DropdownMenuItem
                                    onClick={() => { haptic.trigger("light"); onToggleSelectMode(); }}
                                    className="cursor-pointer py-2.5 px-2.5 rounded-lg"
                                  >
                                    <DownloadSimpleIcon size={16} className="mr-2.5 text-neutral-500" />
                                    Download Photos
                                  </DropdownMenuItem>
                                )}

                                {/* Grid Layout toggle */}
                                <div className="px-2.5 py-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-neutral-600 dark:text-neutral-400">Grid</span>
                                    <div className="flex items-center h-8 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5 gap-0.5">
                                      {([1, 2, 3] as GalleryColumns[]).map((col) => (
                                        <button
                                          key={col}
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            haptic.trigger("selection")
                                            onGalleryColumnsChange?.(col)
                                          }}
                                          className={`relative flex items-center justify-center w-8 h-7 rounded-md transition-all duration-200 cursor-pointer ${galleryColumns === col
                                              ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-neutral-100'
                                              : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300'
                                            }`}
                                        >
                                          {col === 1 ? (
                                            <SquareIcon size={13} weight="bold" />
                                          ) : col === 2 ? (
                                            <div className="flex gap-[2px]">
                                              <div className="w-[4px] h-[10px] rounded-[1px] bg-current" />
                                              <div className="w-[4px] h-[10px] rounded-[1px] bg-current" />
                                            </div>
                                          ) : (
                                            <SquaresFour size={13} weight="bold" />
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </DropdownMenuGroup>
                            )}

                            {/* Share section (Organizer) */}
                            {isOrganizer && (
                              <>
                                {showGalleryActions && <DropdownMenuSeparator />}
                                <DropdownMenuGroup>
                                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-semibold px-2 pt-1.5 pb-1">
                                    Share
                                  </DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => { haptic.trigger("light"); onShareClick?.(); }} className="cursor-pointer py-2.5 px-2.5 rounded-lg font-medium">
                                    <ShareNetwork size={16} className="mr-2.5 text-neutral-500" />
                                    Share Event & QR
                                  </DropdownMenuItem>
                                  {event?.encryption_mode === 'E2EE' ? (
                                    <>
                                      <DropdownMenuItem onClick={async () => {
                                        haptic.trigger("success")
                                        try {
                                          await navigator.clipboard.writeText(event.invite_code)
                                          toast.success('Event code copied!')
                                        } catch {
                                          toast.error('Failed to copy event code')
                                        }
                                      }} className="cursor-pointer py-2.5 px-2.5 rounded-lg">
                                        <CopySimpleIcon size={16} className="mr-2.5 text-neutral-500" />
                                        Copy Invite Code
                                        <span className="ml-auto font-mono text-[11px] text-neutral-400 dark:text-neutral-500">
                                          {event?.invite_code}
                                        </span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={async () => {
                                        haptic.trigger("success")
                                        const passphrase = sessionStorage.getItem('passphrase_' + event.id) || ''
                                        if (passphrase) {
                                          try {
                                            await navigator.clipboard.writeText(passphrase)
                                            toast.success('Passphrase copied!')
                                          } catch {
                                            toast.error('Failed to copy passphrase')
                                          }
                                        } else {
                                          toast.error('Passphrase not cached in this session.')
                                        }
                                      }} className="cursor-pointer py-2.5 px-2.5 rounded-lg">
                                        <Lock size={16} className="mr-2.5 text-neutral-500" />
                                        Copy Passphrase
                                      </DropdownMenuItem>
                                    </>
                                  ) : (
                                    <DropdownMenuItem onClick={() => { haptic.trigger("success"); onCopyInviteCode(); }} className="cursor-pointer py-2.5 px-2.5 rounded-lg">
                                      <CopySimpleIcon size={16} className="mr-2.5 text-neutral-500" />
                                      Copy Invite Code
                                      <span className="ml-auto font-mono text-[11px] text-neutral-400 dark:text-neutral-500">
                                        {event?.invite_code}
                                      </span>
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={async () => {
                                    haptic.trigger("success")
                                    const url = `${window.location.origin}/events?joinCode=${event?.invite_code}`
                                    try {
                                      await navigator.clipboard.writeText(url)
                                      toast.success('Invite link copied!')
                                    } catch (err) {
                                      toast.error('Failed to copy invite link')
                                    }
                                  }} className="cursor-pointer py-2.5 px-2.5 rounded-lg">
                                    <LinkSimple size={16} className="mr-2.5 text-neutral-500" />
                                    Copy Invite Link
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                              </>
                            )}

                            {/* Event section (Organizer) */}
                            {isOrganizer && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-semibold px-2 pt-1.5 pb-1">
                                    Event
                                  </DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => { haptic.trigger("light"); onAttendeesClick(); }} className="cursor-pointer py-2.5 px-2.5 rounded-lg flex items-center justify-between">
                                    <div className="flex items-center">
                                      <Users size={16} className="mr-2.5 text-neutral-500" />
                                      <span>Attendees</span>
                                    </div>
                                    {pendingRequestCount > 0 && (
                                      <span className="flex items-center justify-center bg-amber-500 text-white text-[10px] font-bold h-4 min-w-[16px] px-1.5 rounded-full">
                                        {pendingRequestCount > 9 ? "9+" : pendingRequestCount}
                                      </span>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { haptic.trigger("light"); onSettingsClick(); }} className="cursor-pointer py-2.5 px-2.5 rounded-lg">
                                    <Gear size={16} className="mr-2.5 text-neutral-500" />
                                    Settings
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                              </>
                            )}

                            {event?.encryption_mode === 'E2EE' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                  <DropdownMenuItem
                                    onClick={() => { haptic.trigger("light"); onForgetDeviceKeys?.(); }}
                                    className="cursor-pointer py-2.5 px-2.5 rounded-lg text-amber-500 hover:text-amber-600"
                                  >
                                    <Lock size={16} className="mr-2.5" />
                                    Forget Device Keys
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                              </>
                            )}

                            {/* Leave (Attendee) */}
                            {isAttendee && (
                              <>
                                {showGalleryActions && <DropdownMenuSeparator />}
                                <DropdownMenuGroup>
                                  <DropdownMenuItem
                                    onClick={() => { haptic.trigger("warning"); setShowLeaveConfirm(true); }}
                                    variant="destructive"
                                    className="cursor-pointer py-2.5 px-2.5 rounded-lg"
                                  >
                                    <SignOut size={16} className="mr-2.5" />
                                    Leave Event
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* ═══ DESKTOP: Consolidated Manage menu ═══ */}
                      <div className="hidden sm:block">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              onClick={() => haptic.trigger("light")}
                              className="h-9 lg:h-10 px-3 lg:px-4 flex items-center gap-1.5 lg:gap-2 rounded-xl text-xs lg:text-sm font-semibold shrink-0 cursor-pointer"
                            >
                              <Gear size={18} weight="bold" className="w-4 h-4 lg:w-[18px] lg:h-[18px]" />
                              <span>Manage</span>
                              {pendingRequestCount > 0 && (
                                <span className="flex items-center justify-center bg-amber-500 text-white text-[10px] font-bold h-4 min-w-[16px] px-1.5 rounded-full ml-1 shrink-0">
                                  {pendingRequestCount}
                                </span>
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5">
                            {isOrganizer && (
                              <DropdownMenuGroup>
                                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-semibold px-2 pt-1.5 pb-1">
                                  Event
                                </DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => { haptic.trigger("light"); onAttendeesClick(); }}
                                  className="cursor-pointer py-2.5 px-2.5 rounded-lg flex items-center justify-between"
                                >
                                  <div className="flex items-center">
                                    <Users size={16} className="mr-2.5 text-neutral-500" />
                                    <span>Attendees</span>
                                  </div>
                                  {pendingRequestCount > 0 && (
                                    <span className="flex items-center justify-center bg-amber-500 text-white text-[10px] font-bold h-4 min-w-[16px] px-1.5 rounded-full shrink-0">
                                      {pendingRequestCount}
                                    </span>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => { haptic.trigger("light"); onSettingsClick(); }}
                                  className="cursor-pointer py-2.5 px-2.5 rounded-lg"
                                >
                                  <Gear size={16} className="mr-2.5 text-neutral-500" />
                                  <span>Settings</span>
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                            )}

                            {event?.encryption_mode === 'E2EE' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => { haptic.trigger("light"); onForgetDeviceKeys?.(); }}
                                  className="cursor-pointer py-2.5 px-2.5 rounded-lg text-amber-500 hover:text-amber-600"
                                >
                                  <Lock size={16} className="mr-2.5" />
                                  <span>Forget Keys</span>
                                </DropdownMenuItem>
                              </>
                            )}

                            {isAttendee && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => { haptic.trigger("warning"); setShowLeaveConfirm(true); }}
                                  variant="destructive"
                                  className="cursor-pointer py-2.5 px-2.5 rounded-lg text-red-500"
                                >
                                  <SignOut size={16} className="mr-2.5" />
                                  <span>Leave Event</span>
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {/* Desktop CTA actions */}
                  <motion.div layout className="flex-none order-1 sm:order-none flex items-center gap-2">
                    {event && event._count.photos >= 5 && (
                      <Button
                        variant="outline"
                        className="h-9 lg:h-10 px-3 lg:px-6 flex items-center justify-center gap-1.5 lg:gap-2 rounded-xl border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-850 cursor-pointer text-xs lg:text-sm font-semibold transition-colors shrink-0 whitespace-nowrap"
                        onClick={() => { haptic.trigger("light"); onMemoryLaneClick?.(); }}
                      >
                        <MusicNotes size={18} weight="bold" className="text-rose-500 w-4 h-4 lg:w-[18px] lg:h-[18px]" />
                        <span>Memory Lane</span>
                      </Button>
                    )}
                    {renderCTA(false)}
                  </motion.div>
                </motion.div>
              ) : (
                // Select mode buttons
                <motion.div layout className="flex items-center gap-2 sm:gap-4 w-max sm:w-auto justify-between sm:justify-start">
                  <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mr-auto sm:mr-0 px-2 shrink-0">
                    {selectedCount} <span className="hidden sm:inline">selected</span>
                  </span>

                  <div className="flex items-center gap-2 shrink-0">
                    {onSelectAll && (
                      <Button
                        variant="outline"
                        onClick={() => { haptic.trigger("light"); onSelectAll(); }}
                        className="h-10 px-3 sm:px-4 flex items-center justify-center rounded-xl"
                      >
                        <span className="hidden sm:inline">{isAllSelected ? "Deselect All" : "Select All"}</span>
                        <span className="inline sm:hidden">{isAllSelected ? "Deselect" : "All"}</span>
                      </Button>
                    )}

                    <Button
                      onClick={() => { haptic.trigger("light"); onDownloadSelected(); }}
                      disabled={selectedCount === 0}
                      className="flex items-center justify-center gap-2 h-10 px-4 sm:px-6 rounded-xl"
                    >
                      <DownloadSimple size={18} weight="bold" />
                      <span className="hidden sm:inline">Download</span>
                      {selectedCount > 0 && <span className="sm:hidden">({selectedCount})</span>}
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => { haptic.trigger("light"); onToggleSelectMode(); }}
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

          {/* Row 2: Tabs and Gallery Controls */}
          <div className="mt-2 -mx-4 px-4 sm:mx-0 sm:px-0 border-t border-neutral-100 dark:border-neutral-800/60 pt-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
              <Tabs value={activeTab} onValueChange={(v) => { haptic.trigger("selection"); onTabChange(v as TabType) }} className="w-full sm:w-auto">
                <TabsList className="bg-muted w-max min-w-full sm:w-auto flex shrink-0 rounded-full p-1 relative">
                  {((['all', 'your-photos', 'favourites', 'your-uploads', 'connections'] as TabType[]).filter(tab => {
                    if (event?.encryption_mode === 'E2EE') {
                      return tab !== 'your-photos' && tab !== 'connections'
                    }
                    return true
                  })).map((tab) => {
                    const isActive = activeTab === tab;
                    return (
                      <TabsTrigger
                        key={tab}
                        value={tab}
                        className={`relative flex items-center gap-2 whitespace-nowrap px-3 sm:px-4 py-2 rounded-full z-10 transition-colors ${isActive ? '!text-primary-foreground data-active:bg-transparent dark:data-active:bg-transparent shadow-none data-active:shadow-none' : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300'}`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="tab-indicator"
                            className="absolute inset-0 bg-primary rounded-full shadow-sm -z-10"
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

              {/* Desktop Gallery Controls: Sort and Select/Download (moved next to tabs) */}
              {showGalleryActions && (
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild delay={0}>
                      <Button
                        variant="outline"
                        className="h-9 px-3 flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold shrink-0 cursor-pointer border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-850"
                        onClick={() => { haptic.trigger("light"); onToggleSort(); }}
                      >
                        {sortOrder === 'desc' ? (
                          <SortDescending size={16} weight="bold" />
                        ) : (
                          <SortAscending size={16} weight="bold" />
                        )}
                        <span>Sort</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Sort Photos</TooltipContent>
                  </Tooltip>

                  {(isOrganizer || event?.allow_downloads) && (
                    <Tooltip>
                      <TooltipTrigger asChild delay={0}>
                        <Button
                          variant="outline"
                          className="h-9 px-3 flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold shrink-0 cursor-pointer border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-850"
                          onClick={() => { haptic.trigger("light"); onToggleSelectMode(); }}
                        >
                          <DownloadSimpleIcon size={16} weight="bold" />
                          <span>Select &amp; Download</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Select Photos to download</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              )}
            </div>
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
            <AlertDialogCancel className="rounded-2xl" disabled={leaving} onClick={() => haptic.trigger("light")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { haptic.trigger("warning"); handleLeave() }}
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
