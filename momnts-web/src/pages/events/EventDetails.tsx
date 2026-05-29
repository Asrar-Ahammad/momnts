import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { ArrowLeft, X } from '@phosphor-icons/react'
import { eventsApi, EventData } from '../../features/events/services/events.api'
import { photosApi, PhotoData } from '../../features/events/services/photos.api'
import { toast } from 'sonner'
import { authHeaders } from '../../lib/authHeaders'
import { useEventSocket } from '../../hooks/useEventSocket'
import EventHeader from './components/EventHeader'
import { useQueryClient } from '@tanstack/react-query'
import { useEventDetails, useEventPhotos, useMyPhotos, useEventAttendees } from '../../features/events/hooks/useEvents'
import PhotoGrid from './components/PhotoGrid'
import UploadModal, { FileUploadStatus } from './components/UploadModal'
import EventSettingsModal from './components/EventSettingsModal'
import AttendeesModal from './components/AttendeesModal'
import PhotoCarousel from './components/PhotoCarousel'
import WhoWasIWith from '../../features/connections/components/WhoWasIWith'

type TabType = 'all' | 'your-photos' | 'favourites' | 'your-uploads' | 'connections'
type GalleryColumns = 1 | 2 | 3

const EventDetails = () => {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [activeTab, setActiveTab] = useState<TabType>('all')
  const queryClient = useQueryClient()
  const { data: event, isLoading: eventLoading } = useEventDetails(eventId)
  const { data: photos = [], isLoading: photosLoading } = useEventPhotos(eventId)
  const { data: myPhotosResponse, isLoading: myPhotosLoading } = useMyPhotos(eventId)
  const myPhotos = myPhotosResponse?.data || []
  const loading = eventLoading || photosLoading || myPhotosLoading
  const { data: attendees = [], isLoading: attendeesLoading } = useEventAttendees(eventId)

  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [inviteCodeCopied, setInviteCodeCopied] = useState(false)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    date: '',
    location: '',
    isActive: true
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const uploadingRef = useRef(false)
  const savingSettingsRef = useRef(false)
  const [carouselOpen, setCarouselOpen] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set())
  const [attendeesModalOpen, setAttendeesModalOpen] = useState(false)
  const [fileStatuses, setFileStatuses] = useState<FileUploadStatus[]>([])
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(null)
  const [favouritePhotoIds, setFavouritePhotoIds] = useState<Set<string>>(new Set())
  const [galleryColumns, setGalleryColumns] = useState<GalleryColumns>(() => {
    const saved = localStorage.getItem('momnts_gallery_cols')
    return (saved && [1, 2, 3].includes(Number(saved))) ? Number(saved) as GalleryColumns : 2
  })

  const handleGalleryColumnsChange = (cols: GalleryColumns) => {
    setGalleryColumns(cols)
    localStorage.setItem('momnts_gallery_cols', String(cols))
  }

  // ── Real-time WebSocket updates ──
  useEventSocket({
    eventId,
    onPhotoProcessed: useCallback((data) => {
      // Update the photo's processed flag in the query cache
      queryClient.setQueryData<PhotoData[]>(["photos", eventId], (prev) =>
        prev?.map((p) =>
          p.id === data.photoId
            ? { ...p, processed: true, _count: { photo_faces: data.totalFaces } }
            : p
        )
      )

      if (data.totalFaces > 0) {
        toast.info(`${data.totalFaces} face(s) detected in a photo`, {
          duration: 3000,
        })
      }
    }, [eventId, queryClient]),
    onFaceMatched: useCallback((data) => {
      // Only show toast to the matched user
      if (data.userId === user?.id) {
        toast.success(`Your face found in ${data.matchedPhotoCount} photo(s)! 🎉`, {
          duration: 5000,
        })
        // Invalidate "Your Photos" query to fetch updated data
        if (eventId) {
          queryClient.invalidateQueries({ queryKey: ["my-photos", eventId] })
        }
      }
    }, [user?.id, eventId, queryClient]),
  })

  // Sync favorites
  useEffect(() => {
    const favIds = new Set<string>()
    photos.forEach((p) => {
      if (p.favourites && p.favourites.length > 0) {
        favIds.add(p.id)
      }
    })
    myPhotos.forEach((p) => {
      if (p.favourites && p.favourites.length > 0) {
        favIds.add(p.id)
      }
    })
    setFavouritePhotoIds(favIds)
  }, [photos, myPhotos])

  const handleToggleFavourite = async (photoId: string) => {
    if (!eventId) return
    try {
      // Optimistic update for latency-free experience
      setFavouritePhotoIds((prev) => {
        const next = new Set(prev)
        if (next.has(photoId)) {
          next.delete(photoId)
        } else {
          next.add(photoId)
        }
        return next
      })

      // Backend persist
      const response = await photosApi.toggleFavourite(eventId, photoId)

      // Sync state with actual response
      setFavouritePhotoIds((prev) => {
        const next = new Set(prev)
        if (response.isFavourite) {
          next.add(photoId)
        } else {
          next.delete(photoId)
        }
        return next
      })

      if (response.isFavourite) {
        toast.success('Added to Favourites! ❤️')
      } else {
        toast.success('Removed from Favourites')
      }
      queryClient.invalidateQueries({ queryKey: ['photos', eventId] })
      queryClient.invalidateQueries({ queryKey: ['my-photos', eventId] })
    } catch (error) {
      console.error('Failed to toggle favourite:', error)
      toast.error('Failed to toggle favourite')
      // Rollback
      queryClient.invalidateQueries({ queryKey: ['photos', eventId] })
      queryClient.invalidateQueries({ queryKey: ['my-photos', eventId] })
    }
  }

  const handleDownloadFavourites = async () => {
    const photosToDownload = photos.filter(p => favouritePhotoIds.has(p.id))
    if (photosToDownload.length === 0) return

    const toastId = toast.loading(`Preparing to download ${photosToDownload.length} favourite photo(s)...`)
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < photosToDownload.length; i++) {
      const photo = photosToDownload[i]
      try {
        const apiUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'
        const downloadUrl = `${apiUrl}/api/photos/${photo.event_id}/${photo.id}/download`

        const response = await fetch(downloadUrl, {
          headers: authHeaders(),
        })

        if (!response.ok) throw new Error('Network response was not ok')

        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `momnts-fav-${photo.id}.jpg`
        document.body.appendChild(a)
        a.click()

        // Cleanup
        setTimeout(() => {
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        }, 100)

        // Progress update
        toast.loading(`Downloading ${i + 1}/${photosToDownload.length} favourite(s)...`, { id: toastId })

        // Delay to prevent browser blocking
        await new Promise(resolve => setTimeout(resolve, 500))
        successCount++
      } catch (error) {
        console.error(`Failed to download photo ${photo.id}:`, error)
        toast.error(`Failed to download photo ${i + 1}`)
        failCount++
        toast.loading(`Downloading ${i + 1}/${photosToDownload.length} favourite(s)...`, { id: toastId })
      }
    }

    if (failCount === 0) {
      toast.success('All favourites downloaded!', { id: toastId })
    } else if (successCount > 0) {
      toast.warning(`Downloaded ${successCount} favourites, ${failCount} failed.`, { id: toastId })
    } else {
      toast.error('All downloads failed.', { id: toastId })
    }
  }

  // Handle URL view parameters (e.g., from notifications)
  useEffect(() => {
    if (searchParams.get('view') === 'attendees') {
      setAttendeesModalOpen(true)
      // Clean up URL without removing other parameters in sync with React Router
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('view')
      setSearchParams(newParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const sourcePhotos =
    activeTab === 'your-photos'
      ? myPhotos
      : activeTab === 'favourites'
        ? photos.filter((p) => favouritePhotoIds.has(p.id))
        : photos
  const filteredPhotos = [...sourcePhotos.filter((photo) => {
    if (selectedAttendeeId) {
      if (photo.user_id !== selectedAttendeeId && photo.user?.id !== selectedAttendeeId) {
        return false
      }
    }
    switch (activeTab) {
      case 'your-uploads':
        return photo.user_id === user?.id || photo.user?.id === user?.id
      case 'your-photos':
      case 'all':
      default:
        return true
    }
  })].sort((a, b) => {
    const timeA = new Date(a.uploaded_at).getTime()
    const timeB = new Date(b.uploaded_at).getTime()
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files])
      setFileStatuses(prev => [...prev, ...files.map((): FileUploadStatus => 'pending')])
    }
  }

  const handleUpload = async () => {
    if (!eventId || selectedFiles.length === 0 || uploadingRef.current) return

    if (event?.user_role === 'ATTENDEE') {
      const limit = event.attendee_upload_limit
      const currentCount = photos.filter(p => p.user_id === user?.id).length
      if (currentCount + selectedFiles.length > limit) {
        const remaining = Math.max(0, limit - currentCount)
        if (remaining === 0) {
          toast.error(`Event upload quota reached. Max ${limit} photos per event.`)
        } else {
          toast.error(`You can only upload ${remaining} more photo(s).`)
        }
        return
      }
    }

    try {
      uploadingRef.current = true
      setUploading(true)
      // Initialize all files as 'uploading'
      setFileStatuses(selectedFiles.map(() => 'uploading'))

      await photosApi.uploadPhotos(
        eventId,
        selectedFiles,
        (fileIndex) => {
          // Mark specific file as completed
          setFileStatuses(prev => {
            const newStatuses = [...prev]
            newStatuses[fileIndex] = 'completed'
            return newStatuses
          })
        },
        (fileIndex) => {
          // Mark specific file as error
          setFileStatuses(prev => {
            const newStatuses = [...prev]
            newStatuses[fileIndex] = 'error'
            return newStatuses
          })
        }
      )

      toast.success(`${selectedFiles.length} photo(s) uploaded successfully!`)

      // Delay closing so user can see the green check marks
      await new Promise(resolve => setTimeout(resolve, 1000))

      setUploadModalOpen(false)
      setSelectedFiles([])
      setFileStatuses([])
      queryClient.invalidateQueries({ queryKey: ['photos', eventId] })
      queryClient.invalidateQueries({ queryKey: ['my-photos', eventId] })
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
    } catch (error) {
      console.error('Failed to upload photos:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload photos')
    } finally {
      uploadingRef.current = false
      setUploading(false)
    }
  }

  const handleCopyInviteCode = () => {
    if (event?.invite_code) {
      navigator.clipboard.writeText(event.invite_code)
      setInviteCodeCopied(true)
      setTimeout(() => setInviteCodeCopied(false), 2000)
      toast.success('Invite code copied!')
    }
  }

  const handleOpenSettings = () => {
    if (event) {
      setSettingsForm({
        name: event.name,
        date: event.date,
        location: event.location,
        isActive: event.is_active
      })
      setSettingsModalOpen(true)
    }
  }

  const handleSaveSettings = async () => {
    if (!eventId || savingSettingsRef.current) return

    try {
      savingSettingsRef.current = true
      setSavingSettings(true)
      await eventsApi.updateEvent(
        eventId,
        settingsForm.name,
        settingsForm.date,
        settingsForm.location,
        settingsForm.isActive
      )
      toast.success('Event updated successfully!')
      setSettingsModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
    } catch (error) {
      console.error('Failed to update event:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update event')
    } finally {
      savingSettingsRef.current = false
      setSavingSettings(false)
    }
  }

  const handlePhotoClick = (index: number) => {
    if (isSelectMode) {
      const photoId = filteredPhotos[index].id
      handleToggleSelect(photoId)
    } else {
      setCurrentPhotoIndex(index)
      setCarouselOpen(true)
    }
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (!eventId) return
    try {
      await photosApi.deletePhoto(eventId, photoId)
      toast.success('Photo deleted')
      queryClient.invalidateQueries({ queryKey: ['photos', eventId] })
      queryClient.invalidateQueries({ queryKey: ['my-photos', eventId] })
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
    } catch (error) {
      console.error('Failed to delete photo:', error)
      toast.error('Failed to delete photo')
    }
  }

  const handleToggleSelect = (photoId: string) => {
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev)
      if (next.has(photoId)) {
        next.delete(photoId)
      } else {
        next.add(photoId)
      }
      return next
    })
  }

  const handleDownloadSelected = async () => {
    if (selectedPhotoIds.size === 0) return

    const photosToDownload = photos.filter(p => selectedPhotoIds.has(p.id))

    const toastId = toast.loading(`Preparing to download ${photosToDownload.length} photo(s)...`)
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < photosToDownload.length; i++) {
      const photo = photosToDownload[i]
      try {
        const apiUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'
        const downloadUrl = `${apiUrl}/api/photos/${photo.event_id}/${photo.id}/download`

        const response = await fetch(downloadUrl, {
          headers: authHeaders(),
        })

        if (!response.ok) throw new Error('Network response was not ok')

        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `momnts-${photo.id}.jpg`
        document.body.appendChild(a)
        a.click()

        // Cleanup
        setTimeout(() => {
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        }, 100)

        // Progress update
        toast.loading(`Downloading ${i + 1}/${photosToDownload.length} photo(s)...`, { id: toastId })

        // Delay to prevent browser blocking
        await new Promise(resolve => setTimeout(resolve, 500))
        successCount++
      } catch (error) {
        console.error(`Failed to download photo ${photo.id}:`, error)
        toast.error(`Failed to download photo ${i + 1}`)
        failCount++
        // Restore loading toast
        toast.loading(`Downloading ${i + 1}/${photosToDownload.length} photo(s)...`, { id: toastId })
      }
    }

    if (failCount === 0) {
      toast.success('All downloads completed!', { id: toastId })
    } else if (successCount > 0) {
      toast.warning(`Downloaded ${successCount} photos, ${failCount} failed.`, { id: toastId })
    } else {
      toast.error('All downloads failed.', { id: toastId })
    }

    setIsSelectMode(false)
    setSelectedPhotoIds(new Set())
  }

  if (!event && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-neutral-500">Event not found</p>
        <Button onClick={() => navigate('/events')}>
          <ArrowLeft size={16} className="mr-2" />
          Back to Events
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 pb-20 md:pb-6">
      <EventHeader
        event={event}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onBack={() => navigate('/events')}
        onUploadClick={() => setUploadModalOpen(true)}
        onSettingsClick={handleOpenSettings}
        inviteCodeCopied={inviteCodeCopied}
        onCopyInviteCode={handleCopyInviteCode}
        photoCount={photos.length}
        isSelectMode={isSelectMode}
        onToggleSelectMode={() => {
          setIsSelectMode(!isSelectMode)
          setSelectedPhotoIds(new Set())
        }}
        selectedCount={selectedPhotoIds.size}
        onDownloadSelected={handleDownloadSelected}
        onAttendeesClick={() => {
          setAttendeesModalOpen(true)
        }}
        userUploadCount={photos.filter(p => p.user_id === user?.id || p.user?.id === user?.id).length}
        sortOrder={sortOrder}
        onToggleSort={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
        onLeaveEvent={async () => {
          if (!eventId) return
          try {
            await eventsApi.leaveEvent(eventId)
            toast.success('Left event successfully')
            queryClient.invalidateQueries({ queryKey: ['events'] })
            navigate('/events')
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to leave event')
          }
        }}
        onDownloadFavourites={handleDownloadFavourites}
        favouritesCount={favouritePhotoIds.size}
        galleryColumns={galleryColumns}
        onGalleryColumnsChange={handleGalleryColumnsChange}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'connections' ? (
          <WhoWasIWith
            eventId={eventId!}
            favouritePhotoIds={favouritePhotoIds}
            onToggleFavourite={handleToggleFavourite}
          />
        ) : (
          <>
            {selectedAttendeeId && (
              <div className="mb-4 flex items-center">
                <Badge variant="secondary" className="flex items-center gap-2 w-fit py-3 px-3 bg-neutral-200 dark:bg-neutral-800 text-sm">
                  Viewing <span className="capitalize font-semibold">{attendees.find(a => a.user_id === selectedAttendeeId)?.user?.name || 'attendee'}</span> uploads
                  <button
                    type="button"
                    className="hover:text-red-500 flex items-center justify-center p-0.5 rounded-full hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedAttendeeId(null);
                    }}
                  >
                    <X size={14} className="cursor-pointer" />
                  </button>
                </Badge>
              </div>
            )}
            <PhotoGrid
              photos={filteredPhotos}
              loading={loading}
              activeTab={activeTab}
              event={event}
              onPhotoClick={handlePhotoClick}
              onDelete={handleDeletePhoto}
              isSelectMode={isSelectMode}
              selectedPhotoIds={selectedPhotoIds}
              onToggleSelect={handleToggleSelect}
              currentUserId={user?.id}
              userRole={event?.user_role}
              favouritePhotoIds={favouritePhotoIds}
              onToggleFavourite={handleToggleFavourite}
              galleryColumns={galleryColumns}
            />
          </>
        )}
      </div>

      <UploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        selectedFiles={selectedFiles}
        onFileSelect={handleFileSelect}
        onRemoveFile={(index) => {
          setSelectedFiles(prev => prev.filter((_, i) => i !== index))
          setFileStatuses(prev => prev.filter((_, i) => i !== index))
        }}
        onUpload={handleUpload}
        uploading={uploading}
        fileStatuses={fileStatuses}
      />

      <AttendeesModal
        open={attendeesModalOpen}
        onOpenChange={setAttendeesModalOpen}
        attendees={attendees}
        loading={attendeesLoading}
        onSelectAttendee={(attendeeId) => {
          setSelectedAttendeeId(attendeeId)
          setAttendeesModalOpen(false)
          setActiveTab('all')
        }}
        isOrganizer={event?.user_role === 'ORGANIZER'}
        eventId={eventId}
        onRefreshAttendees={() => {
          queryClient.invalidateQueries({ queryKey: ['attendees', eventId] })
          queryClient.invalidateQueries({ queryKey: ['photos', eventId] })
        }}
      />

      <EventSettingsModal
        open={settingsModalOpen}
        onOpenChange={setSettingsModalOpen}
        settingsForm={settingsForm}
        onSettingsFormChange={setSettingsForm}
        onSave={handleSaveSettings}
        saving={savingSettings}
        onDelete={async () => {
          if (!eventId) return
          try {
            await eventsApi.deleteEvent(eventId)
            toast.success('Event deleted successfully')
            queryClient.invalidateQueries({ queryKey: ['events'] })
            navigate('/events')
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to delete event')
          }
        }}
      />

      <PhotoCarousel
        open={carouselOpen}
        onOpenChange={setCarouselOpen}
        photos={filteredPhotos}
        initialIndex={currentPhotoIndex}
        onDelete={handleDeletePhoto}
        currentUserId={user?.id}
        userRole={event?.user_role}
        isEventActive={event?.is_active}
        isFavourite={(photoId) => favouritePhotoIds.has(photoId)}
        onToggleFavourite={handleToggleFavourite}
      />
    </div>
  )
}

export default EventDetails
