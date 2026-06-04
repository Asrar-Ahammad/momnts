import { useState, useRef } from 'react'
import { useNavigate } from 'react-router'
import { format } from 'date-fns'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover'
import { Calendar } from '../../../components/ui/calendar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../components/ui/dialog'
import { CalendarIcon, X } from '@phosphor-icons/react'
import { Switch } from '../../../components/ui/switch'
import { eventsApi, EventData } from '../../../features/events/services/events.api'
import { toast } from 'sonner'
import { useWebHaptics } from 'web-haptics/react'

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

  const handleCreateEvent = async () => {
    if (creatingEventRef.current) return
    if (!newEventName || !newEventLocation || !newEventDate) {
      toast.error('Please fill in all fields')
      haptic.trigger("error")
      return
    }

    try {
      creatingEventRef.current = true
      setCreatingEvent(true)
      const createdEvent = await eventsApi.createEvent(
        newEventName,
        newEventLocation,
        newEventDate.toISOString(),
        newEventUploadLimit,
        isSecure
      )
      toast.success('Event created successfully!')
      haptic.trigger("success")
      resetForm()
      onOpenChange(false)
      navigate(`/events/${createdEvent.id}`)
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
      toast.error(error instanceof Error ? error.message : 'Failed to create event')
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-4xl font-sirage">Create New Event</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new event.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
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
          <div className="flex items-center justify-between gap-2 border border-border rounded-lg p-3 mt-1">
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
        </div>
        <DialogFooter>
          <Button className="cursor-pointer" variant="outline" onClick={handleCancel} disabled={creatingEvent}>
            Cancel
          </Button>
          <Button onClick={handleCreateEvent} disabled={creatingEvent}>
            {creatingEvent ? 'Creating...' : 'Create Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
