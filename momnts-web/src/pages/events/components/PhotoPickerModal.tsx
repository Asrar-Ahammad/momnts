import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { X, Check } from "@phosphor-icons/react"
import { TaggedPhotoThumbnail } from "./TaggedPhotoThumbnail"

export interface PhotoPickerModalProps {
  photos: any[]
  dek: CryptoKey | null
  initialSelected: any[]
  onSelect: (photos: any[]) => void
  onClose: () => void
}

export function PhotoPickerModal({
  photos,
  dek,
  initialSelected,
  onSelect,
  onClose
}: PhotoPickerModalProps) {
  const [selected, setSelected] = useState<any[]>(initialSelected)
  const [visibleLimit, setVisibleLimit] = useState(24)

  const toggleSelect = (photo: any) => {
    if (selected.some((p) => p.id === photo.id)) {
      setSelected((prev) => prev.filter((p) => p.id !== photo.id))
    } else {
      setSelected((prev) => [...prev, photo])
    }
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    if (visibleLimit >= photos.length) return
    // Check if scrolled near the bottom (within 100px)
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 100) {
      setVisibleLimit((prev) => Math.min(prev + 24, photos.length))
    }
  }

  const visiblePhotos = photos.slice(0, visibleLimit)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[70vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex flex-col">
            <span className="font-semibold text-sm">Select Photos to Tag</span>
            <span className="text-[10px] text-muted-foreground">{selected.length} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => onSelect(selected)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold rounded-full px-3 py-1 cursor-pointer h-7"
            >
              Done
            </Button>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-full cursor-pointer transition-colors"
            >
              <X size={16} weight="bold" />
            </button>
          </div>
        </div>

        {/* Photos Grid List */}
        <div className="flex-1 overflow-y-auto p-4" onScroll={handleScroll}>
          {photos.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No photos have been uploaded to this event yet.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {visiblePhotos.map((photo) => {
                  const isSelected = selected.some((p) => p.id === photo.id)
                  return (
                    <div
                      key={photo.id}
                      onClick={() => toggleSelect(photo)}
                      className={`rounded-lg overflow-hidden aspect-square border cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all relative group bg-muted ${isSelected ? "border-primary border-2" : "border-border"
                        }`}
                    >
                      <TaggedPhotoThumbnail photo={photo} dek={dek} isFullFill />
                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                          <div className="bg-primary text-primary-foreground rounded-full p-1 shadow-lg">
                            <Check size={12} weight="bold" />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {visibleLimit < photos.length && (
                <div className="text-center py-2 text-xs text-muted-foreground animate-pulse">
                  Loading more photos...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
