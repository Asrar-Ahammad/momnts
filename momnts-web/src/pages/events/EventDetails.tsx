import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { ArrowLeft, X } from '@phosphor-icons/react'
import { eventsApi, EventData } from '../../features/events/services/events.api'
import { photosApi, PhotoData } from '../../features/events/services/photos.api'
import { toast } from 'sonner'
import { useEventSocket } from '../../hooks/useEventSocket'
import EventHeader from './components/EventHeader'
import PhotoGrid from './components/PhotoGrid'
import UploadModal, { FileUploadStatus } from './components/UploadModal'
import EventSettingsModal from './components/EventSettingsModal'
import AttendeesModal from './components/AttendeesModal'
import PhotoCarousel from './components/PhotoCarousel'

type TabType = 'all' | 'your-photos' | 'your-uploads'

const EventDetails = () => {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [event, setEvent] = useState<EventData | null>(null)
  const [photos, setPhotos] = useState<PhotoData[]>([])
  const [myPhotos, setMyPhotos] = useState<PhotoData[]>([])
  const [myPhotosPrompt, setMyPhotosPrompt] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)
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
  const [carouselOpen, setCarouselOpen] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set())
  const [attendeesModalOpen, setAttendeesModalOpen] = useState(false)
  const [attendees, setAttendees] = useState<any[]>([])
  const [attendeesLoading, setAttendeesLoading] = useState(false)
  const [fileStatuses, setFileStatuses] = useState<FileUploadStatus[]>([])
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(null)

  // ── Real-time WebSocket updates ──
  useEventSocket({
    eventId,
    onPhotoProcessed: useCallback((data) => {
      // Update the photo's processed flag in state (no full refetch needed)
      setPhotos(prev => prev.map(p =>
        p.id === data.photoId ? { ...p, processed: true, _count: { photo_faces: data.totalFaces } } : p
      ))

      if (data.totalFaces > 0) {
        toast.info(`${data.totalFaces} face(s) detected in a photo`, {
          duration: 3000,
        })
      }
    }, []),
    onFaceMatched: useCallback((data) => {
      // Only show toast to the matched user
      if (data.userId === user?.id) {
        toast.success(`Your face found in ${data.matchedPhotoCount} photo(s)! 🎉`, {
          duration: 5000,
        })
        // Refetch "Your Photos" tab data so it's ready when user switches
        if (eventId) {
          photosApi.getMyPhotos(eventId).then(response => {
            setMyPhotos(response.data)
            setMyPhotosPrompt(response.prompt)
          }).catch(console.error)
        }
      }
    }, [user?.id, eventId]),
  })

  const fetchEventDetails = useCallback(async () => {
    if (!eventId) return
    try {
      const eventData = await eventsApi.getEventDetails(eventId)
      setEvent(eventData)
    } catch (error) {
      console.error('Failed to fetch event details:', error)
      toast.error('Failed to load event details')
    }
  }, [eventId])

  const fetchPhotos = useCallback(async () => {
    if (!eventId) return
    try {
      setLoading(true)
      const photosData = await photosApi.getEventPhotos(eventId)
      setPhotos(photosData)
    } catch (error) {
      console.error('Failed to fetch photos:', error)
      toast.error('Failed to load photos')
    } finally {
      setLoading(false)
    }
  }, [eventId])

  const fetchMyPhotos = useCallback(async () => {
    if (!eventId) return
    try {
      setLoading(true)
      const response = await photosApi.getMyPhotos(eventId)
      setMyPhotos(response.data)
      setMyPhotosPrompt(response.prompt)
    } catch (error) {
      console.error('Failed to fetch your photos:', error)
      toast.error('Failed to load your photos')
    } finally {
      setLoading(false)
    }
  }, [eventId])

  const fetchAttendees = useCallback(async () => {
    if (!eventId) return
    try {
      setAttendeesLoading(true)
      const data = await eventsApi.getEventAttendees(eventId)
      setAttendees(data)
    } catch (error) {
      console.error('Failed to fetch attendees:', error)
      toast.error('Failed to load attendees')
    } finally {
      setAttendeesLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    fetchEventDetails()
    fetchPhotos()
  }, [fetchEventDetails, fetchPhotos])

  const fetchPhotosForTab = useCallback(async (tab: TabType) => {
    if (tab === 'your-photos') {
      await fetchMyPhotos()
    } else if (tab === 'all' || tab === 'your-uploads') {
      // For 'all' and 'your-uploads', we still use the main photos list
      if (photos.length === 0) {
        await fetchPhotos()
      }
    }
  }, [fetchMyPhotos, fetchPhotos, photos.length])

  // Handle tab changes
  useEffect(() => {
    fetchPhotosForTab(activeTab)
  }, [activeTab, fetchPhotosForTab])

  const sourcePhotos = activeTab === 'your-photos' ? myPhotos : photos
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
    if (!eventId || selectedFiles.length === 0) return

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
      fetchPhotos()
    } catch (error) {
      console.error('Failed to upload photos:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload photos')
    } finally {
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
    if (!eventId) return

    try {
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
      fetchEventDetails()
    } catch (error) {
      console.error('Failed to update event:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update event')
    } finally {
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
      fetchPhotos()
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
          credentials: 'include' // Required for authenticated route
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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
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
          fetchAttendees()
        }}
        userUploadCount={photos.filter(p => p.user_id === user?.id || p.user?.id === user?.id).length}
        sortOrder={sortOrder}
        onToggleSort={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
        onLeaveEvent={async () => {
          if (!eventId) return
          try {
            await eventsApi.leaveEvent(eventId)
            toast.success('Left event successfully')
            navigate('/events')
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to leave event')
          }
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
        />
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
      />
    </div>
  )
}

export default EventDetails
