import { useState, useRef, useEffect } from 'react'
import { Button } from '../../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogHeader } from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Trash, CalendarBlank, Broadcast, LockKey, DownloadSimple, Sliders, Shield, Warning, Lightning, Image as ImageIcon } from '@phosphor-icons/react'
import { format } from 'date-fns'
import { cn } from '../../../lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover'
import { Calendar } from '../../../components/ui/calendar'
import { Switch } from '../../../components/ui/switch'
import { useWebHaptics } from 'web-haptics/react'
import { useSubscription } from '../../../features/subscription/hooks/useSubscription'
import { useNavigate } from 'react-router'

interface EventSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settingsForm: {
    name: string
    date: string
    location: string
    isActive: boolean
    isSecure: boolean
    allowDownloads: boolean
    coverPhotoId: string | null
  }
  onSettingsFormChange: (form: {
    name: string
    date: string
    location: string
    isActive: boolean
    isSecure: boolean
    allowDownloads: boolean
    coverPhotoId: string | null
  }) => void
  onSave: () => void
  saving: boolean
  onDelete: () => Promise<void>
  inviteCode?: string
  onRegenerateCode?: () => Promise<void>
  photos?: any[]
  encryptionMode?: 'AI' | 'E2EE'
}

const PHOTOS_PER_PAGE = 24

const EventSettingsModal = ({
  open,
  onOpenChange,
  settingsForm,
  onSettingsFormChange,
  onSave,
  saving,
  onDelete,
  inviteCode,
  onRegenerateCode,
  photos,
  encryptionMode,
}: EventSettingsModalProps) => {
  const [activeTab, setActiveTab] = useState<'general' | 'permissions' | 'danger' | 'background'>('general')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [regeneratingCode, setRegeneratingCode] = useState(false)
  const deletingRef = useRef(false)
  const haptic = useWebHaptics()
  const { isPro } = useSubscription()
  const navigate = useNavigate()
  const [visiblePhotosCount, setVisiblePhotosCount] = useState(PHOTOS_PER_PAGE)

  const wasOpenRef = useRef(false)
  const lastActiveTabRef = useRef(activeTab)

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setActiveTab('general')
      setVisiblePhotosCount(PHOTOS_PER_PAGE)
    }
    wasOpenRef.current = open
  }, [open])

  useEffect(() => {
    if (activeTab === 'background' && lastActiveTabRef.current !== 'background') {
      setVisiblePhotosCount(PHOTOS_PER_PAGE)
    }
    lastActiveTabRef.current = activeTab
  }, [activeTab])

  const handlePhotosScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 100) {
      if (photos && visiblePhotosCount < photos.length) {
        setVisiblePhotosCount((prev) => Math.min(prev + PHOTOS_PER_PAGE, photos.length))
      }
    }
  }

  const handleDelete = async () => {
    if (deletingRef.current) return
    try {
      deletingRef.current = true
      setDeleting(true)
      await onDelete()
    } finally {
      deletingRef.current = false
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const tabs = [
    { id: 'general', label: 'General Info', icon: Sliders },
    ...(encryptionMode !== 'E2EE' ? [{ id: 'background', label: 'Card Background', icon: ImageIcon }] : []),
    { id: 'permissions', label: 'Permissions', icon: Shield },
    { id: 'danger', label: 'Danger Zone', icon: Warning, className: 'text-red-500 hover:text-red-600 hover:bg-red-50/50 dark:hover:bg-red-950/20' }
  ]

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[760px] h-auto max-h-[90vh] sm:h-[580px] p-0 flex flex-col sm:flex-row overflow-hidden gap-0 rounded-3xl border border-neutral-100 dark:border-neutral-800">
          
          <DialogTitle className="sr-only">Event Settings</DialogTitle>
          <DialogDescription className="sr-only">Update event details and permissions.</DialogDescription>

          {/* Left Panel: Sidebar */}
          <div className="w-full sm:w-55 bg-neutral-50/80 dark:bg-neutral-900/30 border-b sm:border-b-0 sm:border-r border-neutral-100 dark:border-neutral-800 flex flex-col shrink-0">
            {/* Sidebar Title */}
            <div className="px-5 py-4 sm:py-0 sm:h-[88px] flex flex-col justify-center border-b border-neutral-100 dark:border-neutral-800 shrink-0">
              <h3 className="text-xl font-bold font-sirage text-neutral-900 dark:text-neutral-100 leading-none">Settings</h3>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium mt-1">Manage your event</p>
            </div>

            {/* Sidebar Desktop Nav / Horizontal Scrollable Mobile Nav */}
            <nav className="flex sm:flex-col overflow-x-auto sm:overflow-x-visible px-3 py-2 sm:py-4 gap-2 select-none no-scrollbar">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => { haptic.trigger("selection"); setActiveTab(tab.id); }}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap sm:w-full",
                      isActive
                        ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-sm"
                        : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-500 hover:text-white dark:hover:bg-neutral-850 dark:hover:text-black",
                      tab.id === 'danger' && !isActive && "text-red-500 hover:bg-red-200 dark:hover:bg-red-950/20 dark:hover:text-red-500 hover:text-red-500"
                    )}
                  >
                    <Icon size={16} weight={isActive ? "fill" : "bold"} />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Right Panel: Content Area */}
          <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-neutral-950">
            {/* Content Header */}
            <div className="px-6 py-4 sm:py-0 sm:h-[88px] flex flex-col justify-center border-b border-neutral-100 dark:border-neutral-800 shrink-0 pr-12">
              <h4 className="text-base font-bold text-neutral-900 dark:text-neutral-100 capitalize">
                {activeTab === 'general' ? 'General Information' : activeTab === 'background' ? 'Card Background' : activeTab === 'permissions' ? 'Permissions & Access' : 'Danger Zone'}
              </h4>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                {activeTab === 'general' && "Configure basic information, location, date, and visibility settings."}
                {activeTab === 'background' && "Choose a photo from this event to display as the background for the event card."}
                {activeTab === 'permissions' && "Manage security options, attendee download privileges, and invite codes."}
                {activeTab === 'danger' && "Dangerous actions that cannot be undone. Proceed with caution."}
              </p>
            </div>

            {/* Scrollable Content Form */}
            <div 
              onScroll={activeTab === 'background' ? handlePhotosScroll : undefined}
              className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar"
            >
              {activeTab === 'general' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="space-y-2">
                    <Label htmlFor="event-name">Event Name</Label>
                    <Input
                      id="event-name"
                      value={settingsForm.name}
                      onChange={(e) => onSettingsFormChange({ ...settingsForm, name: e.target.value })}
                      placeholder="Enter event name"
                      className='rounded-full h-10 px-4'
                    />
                  </div>
                  
                  <div className="space-y-2 flex flex-col">
                    <Label htmlFor="event-date">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="event-date"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-10 px-4 rounded-full",
                            !settingsForm.date && "text-muted-foreground"
                          )}
                        >
                          <CalendarBlank size={18} className="mr-2 opacity-70" />
                          {settingsForm.date ? format(new Date(settingsForm.date), "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={settingsForm.date ? new Date(settingsForm.date) : undefined}
                          onSelect={(date) =>
                            onSettingsFormChange({
                              ...settingsForm,
                              date: date ? format(date, "yyyy-MM-dd") : ""
                            })
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="event-location">Location</Label>
                    <Input
                      id="event-location"
                      value={settingsForm.location}
                      onChange={(e) => onSettingsFormChange({ ...settingsForm, location: e.target.value })}
                      placeholder="Enter location"
                      className='rounded-full h-10 px-4'
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border border-neutral-100 dark:border-neutral-800 rounded-2xl bg-neutral-50/30 dark:bg-neutral-900/10">
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        "p-2 rounded-xl transition-colors",
                        settingsForm.isActive 
                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                          : "bg-neutral-50 dark:bg-neutral-800 text-neutral-400"
                      )}>
                        <Broadcast size={18} weight={settingsForm.isActive ? "fill" : "regular"} />
                      </div>
                      <div>
                        <Label htmlFor="event-active" className="text-xs font-bold cursor-pointer">
                          Event is active
                        </Label>
                        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">Toggle event visibility and interaction</p>
                      </div>
                    </div>
                    <Switch
                      id="event-active"
                      checked={settingsForm.isActive}
                      onCheckedChange={(checked) => {
                        haptic.trigger("light")
                        onSettingsFormChange({ ...settingsForm, isActive: checked })
                      }}
                      className="cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'background' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {photos && photos.length > 0 ? (
                    <div className="grid grid-cols-3 gap-3 pr-2 p-1">
                      {/* Default Option (Reset) */}
                      <button
                        type="button"
                        onClick={() => {
                          haptic.trigger("light")
                          onSettingsFormChange({ ...settingsForm, coverPhotoId: null })
                        }}
                        className={cn(
                          "relative aspect-video rounded-xl overflow-hidden border-2 flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-900 transition-all cursor-pointer group",
                          !settingsForm.coverPhotoId
                            ? "border-neutral-900 dark:border-white shadow-md"
                            : "border-neutral-200/40 dark:border-neutral-800 hover:border-neutral-400"
                        )}
                      >
                        <Lightning size={20} weight={!settingsForm.coverPhotoId ? "fill" : "bold"} className={cn(!settingsForm.coverPhotoId ? "text-amber-500" : "text-neutral-400")} />
                        <span className="text-[10px] font-bold mt-1 text-neutral-500 dark:text-neutral-400">Recently Uploaded</span>
                      </button>

                      {/* Photo Options */}
                      {photos.slice(0, visiblePhotosCount).map((photo) => {
                        const isSelected = settingsForm.coverPhotoId === photo.id
                        return (
                          <button
                            key={photo.id}
                            type="button"
                            onClick={() => {
                              haptic.trigger("light")
                              onSettingsFormChange({ ...settingsForm, coverPhotoId: photo.id })
                            }}
                            className={cn(
                              "relative aspect-video rounded-xl overflow-hidden border-2 transition-all cursor-pointer group",
                              isSelected
                                ? "border-neutral-900 dark:border-white shadow-md scale-95"
                                : "border-neutral-200/40 dark:border-neutral-800 hover:border-neutral-400"
                            )}
                          >
                            <img
                              src={photo.thumb_url || photo.display_url}
                              alt="Event photo"
                              className="w-full h-full object-cover"
                            />
                            {isSelected && (
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                <span className="bg-neutral-900/80 dark:bg-white/80 text-white dark:text-neutral-950 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider shadow-sm">
                                  Selected
                                </span>
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-8 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl text-center space-y-1">
                      <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">No photos available yet</p>
                      <p className="text-[10px] text-neutral-400">Upload photos to this event first before choosing a cover image.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'permissions' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between p-4 border border-neutral-100 dark:border-neutral-800 rounded-2xl bg-neutral-50/30 dark:bg-neutral-900/10">
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        "p-2 rounded-xl transition-colors",
                        settingsForm.isSecure 
                          ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" 
                          : "bg-neutral-50 dark:bg-neutral-800 text-neutral-400"
                      )}>
                        <LockKey size={18} weight={settingsForm.isSecure ? "fill" : "regular"} />
                      </div>
                      <div>
                        <Label htmlFor="event-secure" className="text-xs font-bold cursor-pointer">
                          Secure Event
                        </Label>
                        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">Require organizer approval to join</p>
                      </div>
                    </div>
                    <Switch
                      id="event-secure"
                      checked={settingsForm.isSecure}
                      onCheckedChange={(checked) => {
                        haptic.trigger("light")
                        onSettingsFormChange({ ...settingsForm, isSecure: checked })
                      }}
                      className="cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border border-neutral-100 dark:border-neutral-800 rounded-2xl bg-neutral-50/30 dark:bg-neutral-900/10">
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        "p-2 rounded-xl transition-colors",
                        settingsForm.allowDownloads 
                          ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" 
                          : "bg-neutral-50 dark:bg-neutral-800 text-neutral-400"
                      )}>
                        <DownloadSimple size={18} weight={settingsForm.allowDownloads ? "bold" : "regular"} />
                      </div>
                      <div>
                        <Label htmlFor="event-downloads" className="text-xs font-bold cursor-pointer">
                          Allow Downloads
                        </Label>
                        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">Allow attendees to download photos</p>
                      </div>
                    </div>
                    <Switch
                      id="event-downloads"
                      checked={settingsForm.allowDownloads}
                      onCheckedChange={(checked) => {
                        haptic.trigger("light")
                        onSettingsFormChange({ ...settingsForm, allowDownloads: checked })
                      }}
                      className="cursor-pointer"
                    />
                  </div>

                  {inviteCode && (
                    <div className="p-4 border border-neutral-100 dark:border-neutral-800 rounded-2xl bg-neutral-50/30 dark:bg-neutral-900/10 space-y-2.5">
                      <Label className="text-xs font-bold">Invite Code</Label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 px-4 py-2 border border-neutral-100 dark:border-neutral-850 rounded-full bg-white dark:bg-neutral-950 font-mono text-sm tracking-wider select-all text-center">
                          {inviteCode}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-full text-xs font-semibold px-4 h-9 border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-900 dark:hover:bg-amber-950 cursor-pointer"
                          onClick={() => { haptic.trigger("light"); setShowRegenerateConfirm(true); }}
                          disabled={regeneratingCode}
                        >
                          Regenerate
                        </Button>
                      </div>
                      <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium leading-normal">
                        Attendees will need the new code to join. Existing attendees are not affected.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'danger' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-4 border border-red-100 dark:border-red-950/30 rounded-2xl bg-red-50/20 dark:bg-red-950/5 space-y-3">
                    <h5 className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                      <Warning size={16} weight="fill" />
                      Permanently Delete Event
                    </h5>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-normal">
                      Deleting this event will erase all photos, face data, and attendee records. This action cannot be undone.
                    </p>
                    <Button
                      variant="outline"
                      className="rounded-full w-full sm:w-auto text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950 cursor-pointer"
                      onClick={() => { haptic.trigger("warning"); setShowDeleteConfirm(true); }}
                    >
                      <Trash size={16} className="mr-1.5" />
                      Delete Event
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Content Footer */}
            {activeTab !== 'danger' && (
              <div className="border-t border-neutral-100 dark:border-neutral-800 px-6 py-4 flex items-center justify-end gap-2 bg-neutral-50/20 dark:bg-neutral-950/20 shrink-0">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-full">
                  Cancel
                </Button>
                <Button 
                  onClick={onSave} 
                  disabled={saving || !settingsForm.name || !settingsForm.date || !settingsForm.location}
                  className="rounded-full"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl text-red-600">Delete Event</DialogTitle>
            <DialogDescription className="pt-2">
              This will permanently delete <span className="font-semibold text-neutral-900 dark:text-neutral-100">{settingsForm.name}</span> and all its photos, face data, and attendee records. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => { haptic.trigger("light"); setShowDeleteConfirm(false) }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => { haptic.trigger("warning"); handleDelete() }}
              disabled={deleting}
              className="rounded-full"
            >
              {deleting ? 'Deleting...' : 'Delete Forever'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Regenerate Confirmation Dialog */}
      <Dialog open={showRegenerateConfirm} onOpenChange={setShowRegenerateConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl text-amber-600">Regenerate Invite Code</DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to regenerate the invite code? The old code will stop working immediately. New attendees will not be able to join using the old code.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => { haptic.trigger("light"); setShowRegenerateConfirm(false) }}
              disabled={regeneratingCode}
            >
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-full"
              onClick={async () => {
                if (!onRegenerateCode) return
                try {
                  haptic.trigger("warning")
                  setRegeneratingCode(true)
                  await onRegenerateCode()
                  setShowRegenerateConfirm(false)
                } finally {
                  setRegeneratingCode(false)
                }
              }}
              disabled={regeneratingCode}
            >
              {regeneratingCode ? 'Regenerating...' : 'Regenerate'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default EventSettingsModal
