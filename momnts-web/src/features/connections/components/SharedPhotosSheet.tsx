import { useState, useEffect } from "react"
import { X, UserCircleDashed } from "@phosphor-icons/react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
} from "../../../components/ui/dialog"
import { Button } from "../../../components/ui/button"
import { Skeleton } from "../../../components/ui/skeleton"
import { useSharedPhotos } from "../hooks/useConnections"
import { photosApi } from "../../events/services/photos.api"
import type { PhotoData } from "../../events/services/photos.api"
import PhotoCarousel from "../../../pages/events/components/PhotoCarousel"

interface SharedPhotosModalProps {
  eventId: string
  faceProfileId: string | null
  onClose: () => void
  favouritePhotoIds?: Set<string>
  onToggleFavourite?: (photoId: string) => void
}

export default function SharedPhotosSheet({
  eventId,
  faceProfileId,
  onClose,
  favouritePhotoIds: parentFavouritePhotoIds,
  onToggleFavourite: parentOnToggleFavourite,
}: SharedPhotosModalProps) {
  const { data, isLoading, isError, refetch } = useSharedPhotos(
    eventId,
    faceProfileId
  )
  const [carouselIndex, setCarouselIndex] = useState<number | null>(null)
  const isOpen = faceProfileId !== null

  // Local fallback state
  const [localFavouritePhotoIds, setLocalFavouritePhotoIds] = useState<Set<string>>(new Set())

  // Determine active favorites set
  const favouritePhotoIds = parentFavouritePhotoIds ?? localFavouritePhotoIds;

  // Sync local favorites only if parent did not provide them
  useEffect(() => {
    if (!parentFavouritePhotoIds && data?.photos) {
      const favs = new Set<string>()
      data.photos.forEach((photo) => {
        if (photo.is_favourited) {
          favs.add(photo.id)
        }
      })
      setLocalFavouritePhotoIds(favs)
    }
  }, [data, parentFavouritePhotoIds])

  const handleToggleFavourite = parentOnToggleFavourite ?? (async (photoId: string) => {
    const toggle = (set: Set<string>) => {
      const newSet = new Set(set);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    };

    // Optimistic UI update
    setLocalFavouritePhotoIds(toggle);

    try {
      const response = await photosApi.toggleFavourite(eventId, photoId)
      // Sync state with actual backend response
      setLocalFavouritePhotoIds((prev) => {
        const next = new Set(prev)
        if (response.isFavourite) {
          next.add(photoId)
        } else {
          next.delete(photoId)
        }
        return next
      })

      if (response.isFavourite) {
        toast.success("Added to Favourites! ❤️")
      } else {
        toast.success("Removed from Favourites")
      }
    } catch (error) {
      console.error("Failed to toggle favourite:", error)
      toast.error("Failed to toggle favourite")
      // Revert optimistic update on failure
      setLocalFavouritePhotoIds(toggle);
    }
  });

  // Map SharedPhoto to PhotoData for the PhotoCarousel
  const mappedPhotos: PhotoData[] = (data?.photos || []).map((photo) => ({
    id: photo.id,
    event_id: eventId,
    user_id: "",
    thumb_url: photo.thumb_url,
    display_url: photo.display_url,
    original_url: photo.original_url,
    width: photo.width ?? undefined,
    height: photo.height ?? undefined,
    uploaded_at: photo.uploaded_at,
    processed: true,
    is_visible: true,
    user: {
      id: "",
      name: photo.uploader_name,
    },
    favourites: favouritePhotoIds.has(photo.id) ? [{ id: "mock" }] : [],
  }))

  return (
    <>
      {/* ── Gallery modal ── */}
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className="w-[95vw] max-w-[95vw] max-h-[90vh] p-0 overflow-hidden rounded-4xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
          showCloseButton={false}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-b border-neutral-100 dark:border-neutral-800 px-5 py-4 flex items-center gap-3">
            {data?.shared_with?.selfie_url ? (
              <img
                src={data.shared_with.selfie_url}
                alt={data.shared_with.name}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-neutral-200 dark:ring-neutral-700 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 shrink-0">
                <UserCircleDashed size={22} className="text-neutral-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                Photos with {data?.shared_with?.name ?? "..."}
              </h3>
              <p className="text-xs text-neutral-500">
                {data
                  ? `${data.total_shared} photo${data.total_shared === 1 ? "" : "s"} together`
                  : "Loading..."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors"
            >
              <X size={20} weight="bold" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto max-h-[calc(90vh-72px)] px-4 py-4">
            {/* Loading skeleton — masonry-like */}
            {isLoading && (
              <div className="columns-2 sm:columns-3 gap-3 space-y-3">
                {[180, 240, 160, 280, 200, 220].map((h, i) => (
                  <Skeleton
                    key={i}
                    className="rounded-xl w-full break-inside-avoid"
                    style={{ height: h }}
                  />
                ))}
              </div>
            )}

            {/* Error */}
            {isError && (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <p className="text-neutral-500">Failed to load photos</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Retry
                </Button>
              </div>
            )}

            {/* Empty */}
            {!isLoading && !isError && data?.photos.length === 0 && (
              <p className="text-center text-neutral-400 py-16">
                No shared photos found
              </p>
            )}

            {/* Pinterest masonry grid */}
            {!isLoading && !isError && data && data.photos.length > 0 && (
              <div className="columns-2 sm:columns-3 gap-3 space-y-3">
                {data.photos.map((photo, idx) => (
                  <button
                    key={photo.id}
                    type="button"
                    className="relative w-full break-inside-avoid overflow-hidden rounded-xl group cursor-pointer block"
                    onClick={() => setCarouselIndex(idx)}
                  >
                    <img
                      src={photo.thumb_url}
                      alt=""
                      className="w-full h-auto object-cover transition-all duration-200 group-hover:brightness-[0.85] group-hover:scale-[1.02]"
                      loading="lazy"
                      style={
                        photo.width && photo.height
                          ? { aspectRatio: `${photo.width} / ${photo.height}` }
                          : undefined
                      }
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Photo Carousel (same as All Photos tab) ── */}
      {carouselIndex !== null && (
        <PhotoCarousel
          open={carouselIndex !== null}
          onOpenChange={(open) => !open && setCarouselIndex(null)}
          photos={mappedPhotos}
          initialIndex={carouselIndex}
          isFavourite={(photoId) => favouritePhotoIds.has(photoId)}
          onToggleFavourite={handleToggleFavourite}
        />
      )}
    </>
  )
}
