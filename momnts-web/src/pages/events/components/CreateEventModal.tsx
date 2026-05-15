import { useState } from 'react'
import { useNavigate } from 'react-router'
import { format } from 'date-fns'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover'
import { Calendar } from '../../../components/ui/calendar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../components/ui/dialog'
import { CalendarIcon, X } from '@phosphor-icons/react'
import { eventsApi, EventData } from '../../../features/events/services/events.api'
import { toast } from 'sonner'

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
  const [creatingEvent, setCreatingEvent] = useState(false)

  const handleCreateEvent = async () => {
    if (!newEventName || !newEventLocation || !newEventDate) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      setCreatingEvent(true)
      const createdEvent = await eventsApi.createEvent(
        newEventName,
        newEventLocation,
        newEventDate.toISOString(),
        10
      )
      toast.success('Event created successfully!')
      onOpenChange(false)
      setNewEventName('')
      setNewEventLocation('')
      setNewEventDate(undefined)
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
    } finally {
      setCreatingEvent(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    setNewEventName('')
    setNewEventLocation('')
    setNewEventDate(undefined)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <Popover>
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
                  onSelect={setNewEventDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
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
