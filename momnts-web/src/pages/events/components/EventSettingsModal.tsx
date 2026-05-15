import { useState } from 'react'
import { Button } from '../../../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Trash } from '@phosphor-icons/react'

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

  const handleDelete = async () => {
    try {
      setDeleting(true)
      await onDelete()
    } finally {
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
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="event-date">Date</Label>
              <Input
                id="event-date"
                type="date"
                value={settingsForm.date}
                onChange={(e) => onSettingsFormChange({ ...settingsForm, date: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="event-location">Location</Label>
              <Input
                id="event-location"
                value={settingsForm.location}
                onChange={(e) => onSettingsFormChange({ ...settingsForm, location: e.target.value })}
                placeholder="Enter location"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="event-active"
                checked={settingsForm.isActive}
                onChange={(e) => onSettingsFormChange({ ...settingsForm, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-neutral-900 focus:ring-neutral-900"
              />
              <Label htmlFor="event-active" className="cursor-pointer">
                Event is active
              </Label>
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
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
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
