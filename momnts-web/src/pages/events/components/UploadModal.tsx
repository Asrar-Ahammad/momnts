import { Button } from '../../../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/dialog'
import { CloudArrowUp, X as XIcon, Check, Spinner } from '@phosphor-icons/react'
import { useState } from 'react'

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
}

const UploadModal = ({
  open,
  onOpenChange,
  selectedFiles,
  onFileSelect,
  onRemoveFile,
  onUpload,
  uploading,
  fileStatuses
}: UploadModalProps) => {
  const [isDragOver, setIsDragOver] = useState(false)

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
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragOver
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
            <div className="mt-4 max-h-40 overflow-y-auto space-y-2">
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
          <div className="py-2 text-sm text-neutral-600 dark:text-neutral-400">
            Uploading photos...
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => {
            onOpenChange(false)
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
    </Dialog>
  )
}

export default UploadModal
