import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../../../components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../../../components/ui/input-otp'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../components/ui/dialog'
import { X } from '@phosphor-icons/react'
import { eventsApi, EventData } from '../../../features/events/services/events.api'
import { toast } from 'sonner'

interface JoinEventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onEventJoined: (events: EventData[]) => void
  initialInviteCode?: string
}

export const JoinEventModal = ({ open, onOpenChange, onEventJoined, initialInviteCode = '' }: JoinEventModalProps) => {
  const navigate = useNavigate()
  const [inviteCode, setInviteCode] = useState(initialInviteCode.toUpperCase())
  const [joiningEvent, setJoiningEvent] = useState(false)

  useEffect(() => {
    if (open && initialInviteCode) {
      setInviteCode(initialInviteCode.toUpperCase())
    }
  }, [open, initialInviteCode])

  const handleJoinEvent = async () => {
    if (!inviteCode || inviteCode.length !== 6) {
      toast.error('Please enter a valid 6-digit invite code')
      return
    }

    try {
      setJoiningEvent(true)
      const event = await eventsApi.joinEvent(inviteCode)
      toast.success(`Successfully joined ${event.name}!`)
      onOpenChange(false)
      setInviteCode('')
      navigate(`/events/${event.id}`)
      // Refresh events
      const [myEvents, joinedEvents] = await Promise.all([
        eventsApi.getMyEvents(),
        eventsApi.getJoinedEvents()
      ])
      const allEvents = [...myEvents, ...joinedEvents]
      const uniqueEvents = allEvents.filter((event, index, self) =>
        index === self.findIndex((e) => e.id === event.id)
      )
      onEventJoined(uniqueEvents)
    } catch (error) {
      console.error('Failed to join event:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to join event')
    } finally {
      setJoiningEvent(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    setInviteCode('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-4xl font-sirage">Join Event</DialogTitle>
          <DialogDescription>
            Enter the 6-digit invite code to join an event.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6 py-6">
          <InputOTP
            maxLength={6}
            value={inviteCode}
            onChange={(value: string) => setInviteCode(value.toUpperCase())}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <DialogFooter>
          <Button className="cursor-pointer" variant="outline" onClick={handleCancel} disabled={joiningEvent}>
            Cancel
          </Button>
          <Button onClick={handleJoinEvent} disabled={joiningEvent || inviteCode.length !== 6}>
            {joiningEvent ? 'Joining...' : 'Join Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
