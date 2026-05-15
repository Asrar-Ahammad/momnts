import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog"
import { Users, CloudArrowUp, User, Crown } from "@phosphor-icons/react"
import { Skeleton } from "../../../components/ui/skeleton"
import { Badge } from "../../../components/ui/badge"
import { Button } from "../../../components/ui/button"

interface AttendeeData {
  id: string
  user_id: string
  role: 'ORGANIZER' | 'ATTENDEE'
  joined_at: string
  upload_count: number
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
}

const AttendeesModal = ({ open, onOpenChange, attendees, loading, onSelectAttendee, isOrganizer }: AttendeesModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-4xl font-sirage">Attendees</DialogTitle>
          <DialogDescription>
            People joined this event and their activity.
          </DialogDescription>
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
          ) : (
            attendees.map((attendee) => (
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
                  </div>
                  {isOrganizer && attendee.upload_count > 0 && onSelectAttendee && (
                    <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => onSelectAttendee(attendee.user_id)}>
                      View Photos
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AttendeesModal
