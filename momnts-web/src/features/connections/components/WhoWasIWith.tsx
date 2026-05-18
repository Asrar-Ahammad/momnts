import { useState, useEffect } from "react"
import { Camera } from "@phosphor-icons/react"
import { Badge } from "../../../components/ui/badge"
import { Skeleton } from "../../../components/ui/skeleton"
import { useConnections } from "../hooks/useConnections"
import PersonCard from "./PersonCard"
import SharedPhotosSheet from "./SharedPhotosSheet"

interface WhoWasIWithProps {
  eventId: string
  favouritePhotoIds?: Set<string>
  onToggleFavourite?: (photoId: string) => void
}

export default function WhoWasIWith({
  eventId,
  favouritePhotoIds,
  onToggleFavourite,
}: WhoWasIWithProps) {
  const { data, isLoading, isError } = useConnections(eventId)
  const [selectedFaceProfileId, setSelectedFaceProfileId] = useState<
    string | null
  >(null)

  useEffect(() => {
    setSelectedFaceProfileId(null)
  }, [eventId])

  // API returned a message (no face profile found)
  const noFaceProfile =
    !isLoading && !isError && data && data.data.length === 0 && data.message

  // Has profile but no connections
  const emptyConnections =
    !isLoading && !isError && data && data.data.length === 0 && !data.message

  return (
    <div className="w-full">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            Who was I with?
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            People you appeared in photos with
          </p>
        </div>
        {data && data.data.length > 0 && (
          <Badge
            variant="secondary"
            className="text-sm px-3 py-1 bg-neutral-200 dark:bg-neutral-800"
          >
            {data.total_people}
          </Badge>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] rounded-xl" />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <p className="text-center text-neutral-500 py-12">
          Failed to load connections. Try refreshing.
        </p>
      )}

      {/* No face profile */}
      {noFaceProfile && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <Camera
              size={32}
              className="text-neutral-400 dark:text-neutral-500"
            />
          </div>
          <div>
            <p className="text-neutral-500 dark:text-neutral-400 font-medium">
              {data?.message}
            </p>
            {data?.prompt && (
              <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
                {data.prompt}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Has profile but no connections yet */}
      {emptyConnections && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <Camera
              size={32}
              className="text-neutral-400 dark:text-neutral-500"
            />
          </div>
          <div>
            <p className="text-neutral-500 dark:text-neutral-400 font-medium">
              You haven't appeared in photos with anyone yet
            </p>
            <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
              Check back after more photos are uploaded
            </p>
          </div>
        </div>
      )}

      {/* Connections grid */}
      {!isLoading && !isError && data && data.data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {data.data.map((connection) => (
            <PersonCard
              key={connection.face_profile_id}
              connection={connection}
              onClick={() =>
                setSelectedFaceProfileId(connection.face_profile_id)
              }
            />
          ))}
        </div>
      )}

      {/* Shared photos sheet — always rendered, visibility controlled by state */}
      <SharedPhotosSheet
        eventId={eventId}
        faceProfileId={selectedFaceProfileId}
        onClose={() => setSelectedFaceProfileId(null)}
        favouritePhotoIds={favouritePhotoIds}
        onToggleFavourite={onToggleFavourite}
      />
    </div>
  )
}
