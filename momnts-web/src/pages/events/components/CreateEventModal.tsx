import { useState, useRef } from 'react'
import { useNavigate } from 'react-router'
import { format } from 'date-fns'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover'
import { Calendar } from '../../../components/ui/calendar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../components/ui/dialog'
import { CalendarIcon, X, ShieldCheck, Warning, EyeIcon, EyeSlashIcon, LockKey, Info } from '@phosphor-icons/react'
import { Switch } from '../../../components/ui/switch'
import { eventsApi, EventData } from '../../../features/events/services/events.api'
import { toast } from 'sonner'
import { useWebHaptics } from 'web-haptics/react'
import { createE2EEEventKeys } from '../../../lib/crypto/e2ee'
import { storeDEK } from '../../../lib/crypto/keyStore'
import { setPassphrase } from '../../../lib/crypto/passphraseCache'

interface CreateEventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onEventCreated: (events: EventData[]) => void
}

export const CreateEventModal = ({ open, onOpenChange, onEventCreated }: CreateEventModalProps) => {
  const navigate = useNavigate()
  const [newEventName, setNewEventName] = useState('')
  const [newEventLocation, setNewEventLocation] = useState('')
  const [newEventDate, setNewEventDate] = useState<Date | undefined>()
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [newEventUploadLimit, setNewEventUploadLimit] = useState(10)
  const [isSecure, setIsSecure] = useState(true)
  const [creatingEvent, setCreatingEvent] = useState(false)
  const creatingEventRef = useRef(false)
  const haptic = useWebHaptics()

  // E2EE States
  const [isE2EE, setIsE2EE] = useState(false)
  const [passphrase, setPassphrase] = useState('')
  const [confirmPassphrase, setConfirmPassphrase] = useState('')
  const [showPassphrase, setShowPassphrase] = useState(false)
  const [showConfirmPassphrase, setShowConfirmPassphrase] = useState(false)
  const [showRecoveryModal, setShowRecoveryModal] = useState(false)
  const [generatedRecoveryKey, setGeneratedRecoveryKey] = useState('')
  const [createdEventId, setCreatedEventId] = useState<string | null>(null)

  const handleCreateEvent = async () => {
    if (creatingEventRef.current) return
    if (!newEventName || !newEventLocation || !newEventDate) {
      toast.error('Please fill in all fields')
      haptic.trigger("error")
      return
    }

    if (isE2EE) {
      if (!passphrase) {
        toast.error('Please enter a passphrase for E2EE')
        haptic.trigger("error")
        return
      }
      if (passphrase !== confirmPassphrase) {
        toast.error('Passphrases do not match')
        haptic.trigger("error")
        return
      }
    }

    try {
      creatingEventRef.current = true
      setCreatingEvent(true)

      let e2eePayload: any = undefined
      let dek: CryptoKey | null = null
      let recoveryKey = ''

      if (isE2EE) {
        const keys = await createE2EEEventKeys(passphrase)
        e2eePayload = keys.serverPayload
        dek = keys.dek
        recoveryKey = keys.recoveryKey
      }

      const createdEvent = await eventsApi.createEvent(
        newEventName,
        newEventLocation,
        newEventDate.toISOString(),
        newEventUploadLimit,
        isSecure,
        e2eePayload
      )

      if (isE2EE && dek) {
        await storeDEK(createdEvent.id, dek)
        setPassphrase(createdEvent.id, passphrase)
        setGeneratedRecoveryKey(`${newEventName} recovery key : ${recoveryKey}`)
        setCreatedEventId(createdEvent.id)
        setShowRecoveryModal(true)
      } else {
        toast.success('Event created successfully!')
        haptic.trigger("success")
        onOpenChange(false)
        navigate(`/events/${createdEvent.id}`)
      }

      resetForm()

      // Refresh events
      const [myEvents, joinedEvents] = await Promise.all([
        eventsApi.getMyEvents(),
        eventsApi.getJoinedEvents()
      ])
      const allEvents = [...myEvents, ...joinedEvents]
      const uniqueEvents = allEvents.filter((event, index, self) =>
        index === self.findIndex((e) => e.id === event.id)
      )
      onEventCreated(uniqueEvents)
    } catch (error) {
      console.error('Failed to create event:', error)
      if (error instanceof Error && error.message.toLowerCase().includes('limit')) {
        toast.error(error.message)
        onOpenChange(false)
        navigate('/pricing')
      } else {
        toast.error(error instanceof Error ? error.message : 'Failed to create event')
      }
      haptic.trigger("error")
    } finally {
      creatingEventRef.current = false
      setCreatingEvent(false)
    }
  }

  const resetForm = () => {
    setNewEventName('')
    setNewEventLocation('')
    setNewEventDate(undefined)
    setNewEventUploadLimit(10)
    setIsSecure(true)
    setIsE2EE(false)
    setPassphrase('')
    setConfirmPassphrase('')
  }

  const handleAcknowledgeRecoveryKey = () => {
    setShowRecoveryModal(false)
    setGeneratedRecoveryKey('')
    toast.success('Event created successfully!')
    haptic.trigger("success")
    onOpenChange(false)
    if (createdEventId) {
      navigate(`/events/${createdEventId}`)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm()
    }
    onOpenChange(isOpen)
  }

  const handleCancel = () => {
    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open && !showRecoveryModal} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[460px] max-h-[92dvh] flex flex-col p-5 sm:p-6 overflow-hidden rounded-2xl">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-3xl sm:text-4xl font-sirage">Create New Event</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Fill in the details to create a new event.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-1 py-3 sm:py-4 space-y-4 min-h-0 text-sm">
          <div className="grid gap-2">
            <Label htmlFor="name">Event Name</Label>
            <Input
              id="name"
              placeholder="e.g., Birthday Party"
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g., Hyderabad"
              value={newEventLocation}
              onChange={(e) => setNewEventLocation(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Date</Label>
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger>
                <Button variant="outline" className="w-full text-center font-normal">
                  <CalendarIcon size={16} weight="bold" className="mr-2" />
                  {newEventDate ? format(newEventDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={newEventDate}
                  onSelect={(date) => {
                    setNewEventDate(date)
                    setIsDatePickerOpen(false)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="uploadLimit">Attendee Upload Limit</Label>
            <Input
              id="uploadLimit"
              type="number"
              min="0"
              placeholder="10"
              value={newEventUploadLimit}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setNewEventUploadLimit(isNaN(val) ? 0 : val);
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-2 border border-border rounded-lg p-3">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="secure" className="text-sm font-semibold cursor-pointer">Secure Event</Label>
              <span className="text-xs text-muted-foreground">
                Attendees must be approved by organizer before joining.
              </span>
            </div>
            <Switch
              id="secure"
              checked={isSecure}
              onCheckedChange={setIsSecure}
            />
          </div>

          <div className="flex items-center justify-between gap-2 border border-border rounded-lg p-3">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="e2ee" className="text-sm font-semibold cursor-pointer">
                End-to-End Encryption (E2EE)
              </Label>
              <span className="text-xs text-muted-foreground">
                Encrypt photos client-side. Disables AI face matching. Immutable after event creation.
              </span>
            </div>
            <Switch
              id="e2ee"
              checked={isE2EE}
              onCheckedChange={(checked) => {
                setIsE2EE(checked)
                haptic.trigger("light")
              }}
            />
          </div>

          {isE2EE && (
            <div className="grid gap-3 border border-border rounded-lg p-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex gap-2.5 border border-border bg-neutral-50 dark:bg-neutral-900/50 text-neutral-600 dark:text-neutral-400 rounded-lg p-3 text-xs leading-relaxed">
                <Info size={18} className="shrink-0 mt-0.5 text-neutral-500" />
                <div>
                  <strong className="font-semibold block mb-0.5 text-neutral-800 dark:text-neutral-200">Passphrase Required</strong>
                  Choose a passphrase to encrypt this event. You and your guests will need to enter this passphrase to view/unlock photos. <strong>Momnts does not store it and cannot recover it.</strong>
                </div>
              </div>

              <div className="grid gap-1">
                <Label htmlFor="passphrase">Choose Event Passphrase</Label>
                <div className="relative">
                  <Input
                    id="passphrase"
                    type={showPassphrase ? "text" : "password"}
                    placeholder="Enter secure passphrase"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    className="bg-background pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassphrase(!showPassphrase)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                  >
                    {showPassphrase ? <EyeSlashIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                </div>
              </div>
              <div className="grid gap-1">
                <Label htmlFor="confirm-passphrase">Confirm Passphrase</Label>
                <div className="relative">
                  <Input
                    id="confirm-passphrase"
                    type={showConfirmPassphrase ? "text" : "password"}
                    placeholder="Confirm passphrase"
                    value={confirmPassphrase}
                    onChange={(e) => setConfirmPassphrase(e.target.value)}
                    className="bg-background pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassphrase(!showConfirmPassphrase)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                  >
                    {showConfirmPassphrase ? <EyeSlashIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex-shrink-0 pt-2 border-t border-border">
          <Button className="cursor-pointer" variant="outline" onClick={handleCancel} disabled={creatingEvent}>
            Cancel
          </Button>
          <Button onClick={handleCreateEvent} disabled={creatingEvent}>
            {creatingEvent ? 'Creating...' : 'Create Event'}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Recovery Key Display Modal */}
      <Dialog open={showRecoveryModal} onOpenChange={() => {}}>
        <DialogContent 
          className="sm:max-w-[425px] overflow-hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck size={28} className="text-neutral-600 dark:text-neutral-300" />
              Save Your Recovery Key
            </DialogTitle>
            <DialogDescription className="text-sm">
              If you forget your passphrase, this is the only way to recover access. The server does not store this key.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-neutral-50 dark:bg-neutral-900 border border-border rounded-xl p-4 flex flex-col items-center gap-3">
              <span className="text-xs text-muted-foreground font-medium">YOUR RECOVERY KEY</span>
              <span className="font-mono text-lg md:text-xl font-bold tracking-wider text-foreground select-all">
                {generatedRecoveryKey.includes('recovery key:') ? generatedRecoveryKey.split('recovery key:')[1] : generatedRecoveryKey}
              </span>
              <Button
                variant="outline"
                className="mt-2 text-xs flex items-center gap-2"
                onClick={() => {
                  navigator.clipboard.writeText(generatedRecoveryKey)
                  toast.success('Recovery key copied to clipboard!')
                  haptic.trigger("success")
                }}
              >
                Copy Key
              </Button>
            </div>
            
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg p-3 text-xs leading-relaxed flex gap-2">
              <Warning size={20} className="shrink-0 mt-0.5" />
              <span>
                Store this key securely. If you lose both your passphrase and recovery key, all photos in this event will be permanently unrecoverable.
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              className="w-full h-11 rounded-xl font-semibold shadow-md shadow-primary/10"
              onClick={handleAcknowledgeRecoveryKey}
            >
              I've Saved This Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
