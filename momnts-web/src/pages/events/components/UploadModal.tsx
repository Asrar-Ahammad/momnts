import { Button } from '../../../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/dialog'
import { CloudArrowUp, X as XIcon, Check, Spinner, Warning } from '@phosphor-icons/react'
import { useState } from 'react'
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

export type FileUploadStatus = 'pending' | 'uploading' | 'completed' | 'error'

interface UploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedFiles: File[]
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveFile: (index: number) => void
  onUpload: () => void
  uploading: boolean
  fileStatuses: FileUploadStatus[]
  onCancelUpload?: () => void
}

const UploadModal = ({
  open,
  onOpenChange,
  selectedFiles,
  onFileSelect,
  onRemoveFile,
  onUpload,
  uploading,
  fileStatuses,
  onCancelUpload
}: UploadModalProps) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    const imageFiles = droppedFiles.filter(file => file.type.startsWith('image/'))

    if (imageFiles.length > 0) {
      // Create a synthetic event object
      const syntheticEvent = {
        target: {
          files: imageFiles
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>
      onFileSelect(syntheticEvent)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-4xl font-sirage">Upload Photos</DialogTitle>
          <DialogDescription>
            Select photos to upload to this event. Face detection will run automatically.
            (Select up to 50 photos in one upload)
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={onFileSelect}
            className="hidden"
            id="photo-upload"
          />
          <label htmlFor="photo-upload">
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragOver
                  ? 'border-primary bg-primary/5 dark:bg-primary/10'
                  : 'border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <CloudArrowUp size={48} className={`mx-auto mb-4 ${isDragOver ? 'text-primary' : 'text-neutral-400'}`} />
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {selectedFiles.length > 0
                  ? `${selectedFiles.length} file(s) selected`
                  : isDragOver
                    ? 'Drop photos here'
                    : 'Click to select photos or drag and drop'}
              </p>
            </div>
          </label>

          {selectedFiles.length > 0 && (
            <div className="mt-4 max-h-40 overflow-y-auto w-full overflow-x-hidden space-y-2">
              {selectedFiles.map((file, index) => {
                const status = fileStatuses[index] || 'pending'
                return (
                  <div key={index} className="flex items-center justify-between py-2 text-sm gap-2">
                    <span className="truncate flex-1">{file.name}</span>
                    <div className="flex items-center gap-2">
                      {status === 'uploading' && (
                        <Spinner size={16} className="animate-spin text-primary" />
                      )}
                      {status === 'completed' && (
                        <Check size={16} className="text-green-500" weight="bold" />
                      )}
                      {status === 'error' && (
                        <span className="text-red-500 text-xs">Failed</span>
                      )}
                      {(status === 'pending' || status === 'error') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => onRemoveFile(index)}
                          disabled={uploading}
                        >
                          <XIcon size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {uploading && (
          <div className="space-y-2 py-2">
            <div className="flex justify-between text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              <span>Uploading: {fileStatuses.filter(s => s === 'completed').length} / {selectedFiles.length} completed</span>
              <span>{selectedFiles.length > 0 ? Math.round((fileStatuses.filter(s => s === 'completed').length / selectedFiles.length) * 100) : 0}%</span>
            </div>
            <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-neutral-900 dark:bg-white h-full rounded-full transition-all duration-300"
                style={{ width: `${selectedFiles.length > 0 ? (fileStatuses.filter(s => s === 'completed').length / selectedFiles.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => {
            if (uploading) {
              setShowCancelConfirm(true)
            } else {
              onOpenChange(false)
            }
          }}>
            Cancel
          </Button>
          <Button
            onClick={onUpload}
            disabled={selectedFiles.length === 0 || uploading}
          >
            {uploading ? 'Uploading...' : `Upload ${selectedFiles.length || ''} Photo(s)`}
          </Button>
        </div>
      </DialogContent>

      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent className="sm:max-w-sm rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl text-red-600 flex items-center gap-2">
              <Warning size={24} weight="fill" />
              Cancel Upload?
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2">
              Are you sure you want to stop uploading? Photos that have already completed will be saved, but the remaining ones will be cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex gap-2 justify-end pt-4">
            <AlertDialogCancel className="rounded-full mt-0">
              Continue Upload
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-red-600 hover:bg-red-700 text-white border-0"
              onClick={() => {
                setShowCancelConfirm(false)
                if (onCancelUpload) {
                  onCancelUpload()
                } else {
                  onOpenChange(false)
                }
              }}
            >
              Stop Uploading
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}

export default UploadModal
