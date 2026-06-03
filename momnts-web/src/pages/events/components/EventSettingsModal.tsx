import { useState, useRef } from 'react'
import { Button } from '../../../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Trash, CalendarBlank, Broadcast } from '@phosphor-icons/react'
import { format } from 'date-fns'
import { cn } from '../../../lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover'
import { Calendar } from '../../../components/ui/calendar'
import { Switch } from '../../../components/ui/switch'
import { useWebHaptics } from 'web-haptics/react'

interface EventSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settingsForm: {
    name: string
    date: string
    location: string
    isActive: boolean
  }
  onSettingsFormChange: (form: { name: string; date: string; location: string; isActive: boolean }) => void
  onSave: () => void
  saving: boolean
  onDelete: () => Promise<void>
}

const EventSettingsModal = ({
  open,
  onOpenChange,
  settingsForm,
  onSettingsFormChange,
  onSave,
  saving,
  onDelete,
}: EventSettingsModalProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const deletingRef = useRef(false)
  const haptic = useWebHaptics()

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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-4xl font-sirage">Event Settings</DialogTitle>
            <DialogDescription>
              Update event details. Changes will be saved immediately.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-name">Event Name</Label>
              <Input
                id="event-name"
                value={settingsForm.name}
                onChange={(e) => onSettingsFormChange({ ...settingsForm, name: e.target.value })}
                placeholder="Enter event name"
                className='rounded-full'
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
                      "w-full justify-start text-left font-normal h-10 px-3",
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
                className='rounded-full'
              />
            </div>
            
            <div className="flex items-center justify-between p-4 border border-neutral-100 dark:border-neutral-800 rounded-[20px] bg-neutral-50/50 dark:bg-neutral-900/50">
              <div className="flex items-center space-x-3">
                <div className={cn(
                  "p-2.5 rounded-xl shadow-sm transition-colors",
                  settingsForm.isActive 
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                    : "bg-white dark:bg-neutral-800 text-neutral-400"
                )}>
                  <Broadcast size={20} weight={settingsForm.isActive ? "fill" : "regular"} />
                </div>
                <div>
                  <Label htmlFor="event-active" className="text-sm font-bold cursor-pointer">
                    Event is active
                  </Label>
                  <p className="text-[11px] text-neutral-500 font-medium">Toggle event visibility and interaction</p>
                </div>
              </div>
              <Switch
                id="event-active"
                checked={settingsForm.isActive}
                onCheckedChange={(checked) => onSettingsFormChange({ ...settingsForm, isActive: checked })}
                className="cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash size={16} className="mr-1.5" />
              Delete Event
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={onSave} 
                disabled={saving || !settingsForm.name || !settingsForm.date || !settingsForm.location}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
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
            >
              {deleting ? 'Deleting...' : 'Delete Forever'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default EventSettingsModal
