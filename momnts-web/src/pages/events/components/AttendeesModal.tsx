import { useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../components/ui/alert-dialog"
import { Users, CloudArrowUp, User, Crown, UserMinus, Warning, PencilSimple, Check, X } from "@phosphor-icons/react"
import { Skeleton } from "../../../components/ui/skeleton"
import { Badge } from "../../../components/ui/badge"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { toast } from "sonner"
import { eventsApi } from "../../../features/events/services/events.api"

interface AttendeeData {
  id: string
  user_id: string
  role: 'ORGANIZER' | 'ATTENDEE'
  joined_at: string
  upload_count: number
  upload_limit?: number | null
  user: {
    id: string
    name: string
    email: string
    selfie_url: string
  }
}

interface AttendeesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  attendees: AttendeeData[]
  loading: boolean
  onSelectAttendee?: (userId: string) => void
  isOrganizer?: boolean
  eventId?: string
  onRefreshAttendees?: () => void
}

const AttendeesModal = ({ open, onOpenChange, attendees, loading, onSelectAttendee, isOrganizer, eventId, onRefreshAttendees }: AttendeesModalProps) => {
  const [attendeeToRemove, setAttendeeToRemove] = useState<{ id: string, name: string } | null>(null)
  const [removingAttendee, setRemovingAttendee] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingLimitId, setEditingLimitId] = useState<string | null>(null)
  const [limitInputValue, setLimitInputValue] = useState('')
  const [savingLimit, setSavingLimit] = useState(false)

  const removingAttendeeRef = useRef(false)
  const savingLimitRef = useRef(false)

  const handleRemove = async () => {
    if (!eventId || !attendeeToRemove || removingAttendeeRef.current) return
    try {
      removingAttendeeRef.current = true
      setRemovingAttendee(true)
      await eventsApi.removeAttendee(eventId, attendeeToRemove.id)
      toast.success(`${attendeeToRemove.name} has been removed`)
      setAttendeeToRemove(null)
      if (onRefreshAttendees) {
        onRefreshAttendees()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove attendee')
    } finally {
      removingAttendeeRef.current = false
      setRemovingAttendee(false)
    }
  }

  const handleSaveLimit = async (attendee: AttendeeData) => {
    if (!eventId || savingLimitRef.current) return
    try {
      savingLimitRef.current = true
      setSavingLimit(true)
      const parsed = limitInputValue.trim() === '' ? null : parseInt(limitInputValue, 10)
      if (parsed !== null && (isNaN(parsed) || parsed < 0)) {
        toast.error('Please enter a valid non-negative number')
        savingLimitRef.current = false
        setSavingLimit(false)
        return
      }
      await eventsApi.updateAttendeeLimit(eventId, attendee.user_id, parsed)
      toast.success(`Upload limit updated for ${attendee.user.name}`)
      setEditingLimitId(null)
      if (onRefreshAttendees) {
        onRefreshAttendees()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update limit')
    } finally {
      savingLimitRef.current = false
      setSavingLimit(false)
    }
  }

  const filteredAttendees = attendees.filter(attendee => 
    attendee.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    attendee.user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-4xl font-sirage">Attendees</DialogTitle>
            <DialogDescription>
              People joined this event and their activity.
            </DialogDescription>
            {attendees.length > 0 && (
              <div className="mt-2">
                <Input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl"
                />
              </div>
            )}
          </DialogHeader>

          <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))
            ) : attendees.length === 0 ? (
              <div className="text-center py-8">
                <Users size={48} className="mx-auto text-neutral-200 mb-2" />
                <p className="text-neutral-500">No attendees yet</p>
              </div>
            ) : filteredAttendees.length === 0 ? (
              <div className="text-center py-8">
                <Users size={48} className="mx-auto text-neutral-200 mb-2 opacity-50" />
                <p className="text-neutral-500">No matching attendees found</p>
              </div>
            ) : (
              filteredAttendees.map((attendee) => (
                <div 
                  key={attendee.id} 
                  className="flex items-center justify-between p-3 rounded-2xl border border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-400 overflow-hidden">
                        {attendee.user.selfie_url ? (
                          <img 
                            src={attendee.user.selfie_url} 
                            alt={attendee.user.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User size={20} weight="bold" />
                        )}
                      </div>
                      {attendee.role === 'ORGANIZER' && (
                        <div className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-0.5 border-2 border-white dark:border-neutral-900">
                          <Crown size={10} weight="fill" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-neutral-900 dark:text-neutral-100 capitalize leading-tight">
                          {attendee.user.name}
                        </p>
                        {attendee.role === 'ORGANIZER' && (
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">
                            Organizer
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500">
                        Joined {new Date(attendee.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                        <CloudArrowUp size={16} weight="fill" />
                        <span className="text-sm font-medium">{attendee.upload_count}</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 uppercase tracking-tighter font-bold">Photos</p>
                      
                      {attendee.role === 'ATTENDEE' && (
                        editingLimitId === attendee.id ? (
                          <div className="flex items-center gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                            <Input
                              type="number"
                              min="0"
                              className="w-16 h-7 text-xs px-2 text-right font-mono"
                              value={limitInputValue}
                              onChange={(e) => setLimitInputValue(e.target.value)}
                              disabled={savingLimit}
                              autoFocus
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={savingLimit}
                              onClick={() => handleSaveLimit(attendee)}
                              className="h-7 w-7 text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 cursor-pointer"
                            >
                              <Check size={12} weight="bold" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={savingLimit}
                              onClick={() => setEditingLimitId(null)}
                              className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                            >
                              <X size={12} weight="bold" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-neutral-500">
                            <span>Limit: {attendee.upload_limit !== null && attendee.upload_limit !== undefined ? attendee.upload_limit : 'Default'}</span>
                            {isOrganizer && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingLimitId(attendee.id)
                                  setLimitInputValue(attendee.upload_limit !== null && attendee.upload_limit !== undefined ? String(attendee.upload_limit) : '')
                                }}
                                className="h-4 w-4 p-0 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                                title="Edit Limit"
                              >
                                <PencilSimple size={10} />
                              </Button>
                            )}
                          </div>
                        )
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {isOrganizer && attendee.role !== 'ORGANIZER' && eventId && (
                        <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => setAttendeeToRemove({ id: attendee.user_id, name: attendee.user.name })}>
                          <UserMinus size={14} className="mr-1" />
                          Remove
                        </Button>
                      )}
                      {isOrganizer && attendee.upload_count > 0 && onSelectAttendee && (
                        <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => onSelectAttendee(attendee.user_id)}>
                          View Photos
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!attendeeToRemove} onOpenChange={(open) => !open && setAttendeeToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Warning size={24} weight="fill" />
              Remove Attendee
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <span className="font-semibold text-neutral-900 dark:text-neutral-100 capitalize">{attendeeToRemove?.name}</span> from this event? All their uploaded photos will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingAttendee}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={removingAttendee}
              onClick={handleRemove}
            >
              {removingAttendee ? 'Removing...' : 'Remove Attendee'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default AttendeesModal
