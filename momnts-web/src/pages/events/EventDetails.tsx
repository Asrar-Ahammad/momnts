import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { ArrowLeft, X, CaretUp, LockKey } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { eventsApi, EventData } from '../../features/events/services/events.api'
import { photosApi, PhotoData } from '../../features/events/services/photos.api'
import { toast } from 'sonner'
import { authHeaders } from '../../lib/authHeaders'
import { useEventSocket } from '../../hooks/useEventSocket'
import EventHeader from './components/EventHeader'
import { useQueryClient } from '@tanstack/react-query'
import { useEventDetails, useEventPhotos, useMyPhotos, useEventAttendees, usePendingRequestCount } from '../../features/events/hooks/useEvents'
import { MomntsSlideshow } from '../../components/MomntsSlideshow'
import PhotoGrid from './components/PhotoGrid'
import UploadModal, { FileUploadStatus } from './components/UploadModal'
import EventSettingsModal from './components/EventSettingsModal'
import AttendeesModal from './components/AttendeesModal'
import PhotoCarousel from './components/PhotoCarousel'
import WhoWasIWith from '../../features/connections/components/WhoWasIWith'
import ShareEventModal from './components/ShareEventModal'
import { useWebHaptics } from 'web-haptics/react'
import { getDEK, deleteDEK } from '../../lib/crypto/keyStore'
import { getPassphrase } from '../../lib/crypto/passphraseCache'
import { decryptPhoto, detectImageType } from '../../lib/crypto/e2ee'
import PassphrasePrompt from '../../components/PassphrasePrompt'

type TabType = 'all' | 'your-photos' | 'favourites' | 'your-uploads' | 'connections'
type GalleryColumns = 1 | 2 | 3

const EMPTY_ARRAY: any[] = []

const EventDetails = () => {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [activeTab, setActiveTab] = useState<TabType>('all')
  const queryClient = useQueryClient()
  const haptic = useWebHaptics()
  const { data: event, isLoading: eventLoading } = useEventDetails(eventId)
  const { data: photos = EMPTY_ARRAY, isLoading: photosLoading } = useEventPhotos(eventId)
  const isEventE2EE = event?.encryption_mode === 'E2EE'
  const { data: myPhotosResponse, isLoading: myPhotosLoading } = useMyPhotos(
    eventId,
    event ? isEventE2EE : true
  )
  const myPhotos = myPhotosResponse?.data || EMPTY_ARRAY
  const { data: attendees = EMPTY_ARRAY, isLoading: attendeesLoading } = useEventAttendees(eventId)

  const isOrganizer = event?.user_role === 'ORGANIZER'
  const isSecure = event?.is_secure || false
  const { data: pendingRequestCount = 0 } = usePendingRequestCount(eventId, !!isOrganizer && isSecure)
  const [attendeesModalTab, setAttendeesModalTab] = useState<'attendees' | 'requests'>('attendees')

  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [slideshowOpen, setSlideshowOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [inviteCodeCopied, setInviteCodeCopied] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    date: '',
    location: '',
    isActive: true,
    isSecure: true,
    allowDownloads: true,
    coverPhotoId: null as string | null
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const uploadingRef = useRef(false)
  const savingSettingsRef = useRef(false)
  const uploadAbortControllerRef = useRef<AbortController | null>(null)
  const lastInvalidatedPhotoIdRef = useRef<string | null>(null)
  const [carouselOpen, setCarouselOpen] = useState(false)
  const [highlightCommentId, setHighlightCommentId] = useState<string | undefined>(undefined)
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

  const [dek, setDek] = useState<CryptoKey | null>(null)
  const [isPassphrasePromptOpen, setIsPassphrasePromptOpen] = useState(false)

  const isE2EELocked = event?.encryption_mode === 'E2EE' && !dek
  const loading = eventLoading || (!isE2EELocked && (photosLoading || (!isEventE2EE && myPhotosLoading)))

  useEffect(() => {
    return () => {
      document.body.style.pointerEvents = ''
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
      document.documentElement.style.pointerEvents = ''
      document.documentElement.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    if (event?.encryption_mode === 'E2EE') {
      const checkLockStatus = async () => {
        const cachedDek = await getDEK(event.id)
        if (cachedDek) {
          setDek(cachedDek)
          setIsPassphrasePromptOpen(false)
        } else {
          setDek(null)
          setIsPassphrasePromptOpen(true)
        }
      }
      checkLockStatus()
    } else {
      setDek(null)
      setIsPassphrasePromptOpen(false)
    }
  }, [event?.id, event?.encryption_mode])

  const handleGalleryColumnsChange = (cols: GalleryColumns) => {
    setGalleryColumns(cols)
    localStorage.setItem('momnts_gallery_cols', String(cols))
  }

  // ── Real-time WebSocket updates ──
  useEventSocket({
    eventId,
    onPhotoProcessed: useCallback((data) => {
      // Update the photo's processed flag and URLs in the query cache
      queryClient.setQueryData<PhotoData[]>(["photos", eventId], (prev) =>
        prev?.map((p) =>
          p.id === data.photoId
            ? {
              ...p,
              processed: true,
              thumb_url: data.photo.thumb_url,
              display_url: data.photo.display_url,
              original_url: data.photo.original_url,
              _count: { photo_faces: data.totalFaces },
            }
            : p
        )
      )

      // Update the photo's processed flag and URLs in the my-photos query cache
      queryClient.setQueryData<{ data: PhotoData[]; prompt?: string; face_profile_id?: string }>(["my-photos", eventId], (prev) => {
        if (!prev) return prev
        return {
          ...prev,
          data: prev.data.map((p) =>
            p.id === data.photoId
              ? {
                ...p,
                processed: true,
                thumb_url: data.photo.thumb_url,
                display_url: data.photo.display_url,
                original_url: data.photo.original_url,
                _count: { photo_faces: data.totalFaces },
              }
              : p
          )
        }
      })

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
        haptic.trigger("success")
      } else {
        toast.success('Removed from Favourites')
        haptic.trigger("light")
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

        const encryptionIv = response.headers.get('x-encryption-iv')
        const encryptionTag = response.headers.get('x-encryption-tag')

        let blob: Blob
        let fileExtension = 'jpg'
        if (encryptionIv && encryptionTag && dek) {
          // E2EE event: decrypt the ciphertext before saving to device
          const encryptedBuffer = await response.arrayBuffer()
          const decryptedBuffer = await decryptPhoto(encryptedBuffer, encryptionIv, encryptionTag, dek)
          const typeInfo = detectImageType(decryptedBuffer)
          blob = new Blob([decryptedBuffer], { type: typeInfo.mime })
          fileExtension = typeInfo.ext
        } else {
          blob = await response.blob()
          if (blob.type === 'image/webp') {
            fileExtension = 'webp'
          } else if (blob.type === 'image/png') {
            fileExtension = 'png'
          } else if (blob.type === 'image/gif') {
            fileExtension = 'gif'
          } else if (blob.type === 'image/heic') {
            fileExtension = 'heic'
          }
        }

        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `momnts-fav-${photo.id}.${fileExtension}`
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
    const view = searchParams.get('view')
    if (view === 'attendees' || view === 'requests') {
      setAttendeesModalTab(view === 'requests' ? 'requests' : 'attendees')
      setAttendeesModalOpen(true)
      // Clean up URL without removing other parameters in sync with React Router
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('view')
      setSearchParams(newParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // Disable right-click to prevent photo downloads via context menu
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }
    document.addEventListener('contextmenu', handleContextMenu)
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [])

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

  // Handle direct photo and comment navigation (e.g. from mentions notification)
  useEffect(() => {
    const pId = searchParams.get('photoId')
    const cId = searchParams.get('commentId')

    if (pId) {
      // Invalidate query caches to ensure we load the latest uploaded photo and comments
      if (lastInvalidatedPhotoIdRef.current !== pId) {
        lastInvalidatedPhotoIdRef.current = pId
        queryClient.invalidateQueries({ queryKey: ["photos", eventId] })
        queryClient.invalidateQueries({ queryKey: ["comments", pId] })
      }

      if (photos.length > 0) {
        // Clear filters if active so that the target photo is guaranteed to be in filteredPhotos
        if (selectedAttendeeId !== null) {
          setSelectedAttendeeId(null)
        }
        if (activeTab !== 'all') {
          setActiveTab('all')
        }

        const idx = filteredPhotos.findIndex((p) => p.id === pId)
        if (idx !== -1) {
          setCurrentPhotoIndex(idx)
          setCarouselOpen(true)
          if (cId) {
            setHighlightCommentId(cId)
          }

          // Clean up URL search parameters to avoid running repeatedly on page refresh
          const newParams = new URLSearchParams(searchParams)
          newParams.delete('photoId')
          newParams.delete('commentId')
          setSearchParams(newParams, { replace: true })
          lastInvalidatedPhotoIdRef.current = null
        }
      }
    }
  }, [searchParams, setSearchParams, photos, filteredPhotos, activeTab, selectedAttendeeId, eventId, queryClient])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      if (selectedFiles.length + files.length > 50) {
        toast.error("You can select a maximum of 50 photos per upload.")
        haptic.trigger("warning")
        return
      }
      setSelectedFiles(prev => [...prev, ...files])
      setFileStatuses(prev => [...prev, ...files.map((): FileUploadStatus => 'pending')])
      haptic.trigger("light")
    }
  }

  const handleUpload = async () => {
    if (!eventId || selectedFiles.length === 0 || uploadingRef.current) return

    if (selectedFiles.length > 50) {
      toast.error("A maximum of 50 photos can be uploaded at a time.")
      haptic.trigger("warning")
      return
    }

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
        haptic.trigger("warning")
        return
      }
    }

    try {
      uploadingRef.current = true
      setUploading(true)
      // Initialize all files as 'uploading'
      setFileStatuses(selectedFiles.map(() => 'uploading'))
      
      const abortController = new AbortController()
      uploadAbortControllerRef.current = abortController

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
        },
        abortController.signal,
        dek || undefined
      )

      toast.success(`${selectedFiles.length} photo(s) uploaded successfully!`)
      haptic.trigger("success")

      // Delay closing so user can see the green check marks
      await new Promise(resolve => setTimeout(resolve, 1000))

      setUploadModalOpen(false)
      setSelectedFiles([])
      setFileStatuses([])
      queryClient.invalidateQueries({ queryKey: ['photos', eventId] })
      queryClient.invalidateQueries({ queryKey: ['my-photos', eventId] })
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
    } catch (error) {
      if (error instanceof Error && error.message === 'Upload cancelled') {
        toast.info('Upload cancelled.')
      } else if (error instanceof Error && error.message.toLowerCase().includes('limit')) {
        toast.error(error.message)
        haptic.trigger("error")
        setUploadModalOpen(false)
        navigate('/pricing')
      } else {
        console.error('Failed to upload photos:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to upload photos')
        haptic.trigger("error")
      }
    } finally {
      uploadingRef.current = false
      setUploading(false)
      uploadAbortControllerRef.current = null
    }
  }

  const handleCancelUpload = () => {
    if (uploadAbortControllerRef.current) {
      uploadAbortControllerRef.current.abort()
    }
    setUploadModalOpen(false)
    setSelectedFiles([])
    setFileStatuses([])
  }

  const handleCopyInviteCode = () => {
    if (event?.invite_code) {
      let textToCopy = event.invite_code
      let isE2EECopied = false
      if (event.encryption_mode === 'E2EE') {
        const passphrase = getPassphrase(event.id) || ''
        if (passphrase) {
          textToCopy = `Event Code: ${event.invite_code}\nPassphrase: ${passphrase}`
          isE2EECopied = true
        } else {
          toast.info('Passphrase not cached in this session. Only copied event code.')
        }
      }
      navigator.clipboard.writeText(textToCopy)
      setInviteCodeCopied(true)
      setTimeout(() => setInviteCodeCopied(false), 2000)
      toast.success(isE2EECopied ? 'Event code & passphrase copied!' : 'Invite code copied!')
      haptic.trigger("success")
    }
  }

  const handleOpenSettings = () => {
    if (event) {
      setSettingsForm({
        name: event.name,
        date: event.date,
        location: event.location,
        isActive: event.is_active,
        isSecure: event.is_secure,
        allowDownloads: event.allow_downloads,
        coverPhotoId: event.cover_photo_id || null
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
        settingsForm.isActive,
        settingsForm.isSecure,
        settingsForm.allowDownloads,
        undefined,
        settingsForm.coverPhotoId
      )
      toast.success('Event updated successfully!')
      haptic.trigger("success")
      setSettingsModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
    } catch (error) {
      console.error('Failed to update event:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update event')
      haptic.trigger("error")
    } finally {
      savingSettingsRef.current = false
      setSavingSettings(false)
    }
  }

  const handleRegenerateCode = async () => {
    if (!eventId) return
    try {
      await eventsApi.updateEvent(
        eventId,
        settingsForm.name,
        settingsForm.date,
        settingsForm.location,
        settingsForm.isActive,
        settingsForm.isSecure,
        settingsForm.allowDownloads,
        true
      )
      toast.success('Invite code regenerated successfully!')
      haptic.trigger("success")
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
    } catch (error) {
      console.error('Failed to regenerate invite code:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to regenerate invite code')
      haptic.trigger("error")
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

        const encryptionIv = response.headers.get('x-encryption-iv')
        const encryptionTag = response.headers.get('x-encryption-tag')

        let blob: Blob
        let fileExtension = 'jpg'
        if (encryptionIv && encryptionTag && dek) {
          // E2EE event: decrypt the ciphertext before saving to device
          const encryptedBuffer = await response.arrayBuffer()
          const decryptedBuffer = await decryptPhoto(encryptedBuffer, encryptionIv, encryptionTag, dek)
          const typeInfo = detectImageType(decryptedBuffer)
          blob = new Blob([decryptedBuffer], { type: typeInfo.mime })
          fileExtension = typeInfo.ext
        } else {
          blob = await response.blob()
          if (blob.type === 'image/webp') {
            fileExtension = 'webp'
          } else if (blob.type === 'image/png') {
            fileExtension = 'png'
          } else if (blob.type === 'image/gif') {
            fileExtension = 'gif'
          } else if (blob.type === 'image/heic') {
            fileExtension = 'heic'
          }
        }

        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `momnts-${photo.id}.${fileExtension}`
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

  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target

      // Only react to the main scroll container (<main> element) or document scroll
      const isMainScroll = target === document ||
        (target instanceof HTMLElement && target.tagName.toLowerCase() === 'main')

      if (!isMainScroll) return

      let scrollTop = 0
      if (target instanceof HTMLDocument) {
        scrollTop = window.scrollY || document.documentElement.scrollTop
      } else if (target instanceof HTMLElement) {
        scrollTop = target.scrollTop
      }
      setShowScrollTop(scrollTop > 300)
    }

    window.addEventListener('scroll', handleScroll, true)
    return () => window.removeEventListener('scroll', handleScroll, true)
  }, [])

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    const mainEl = document.querySelector('main')
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleSelectAll = () => {
    if (selectedPhotoIds.size === filteredPhotos.length && filteredPhotos.length > 0) {
      setSelectedPhotoIds(new Set())
    } else {
      setSelectedPhotoIds(new Set(filteredPhotos.map(p => p.id)))
    }
  }

  const isAllSelected = filteredPhotos.length > 0 && selectedPhotoIds.size === filteredPhotos.length

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
    <div className="min-h-screen bg-background text-foreground pb-20 md:pb-6 transition-colors duration-300">
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
        pendingRequestCount={pendingRequestCount}
        onAttendeesClick={() => {
          setAttendeesModalTab('attendees')
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
        onMemoryLaneClick={() => setSlideshowOpen(true)}
        onSelectAll={handleSelectAll}
        isAllSelected={isAllSelected}
        onShareClick={() => setShareModalOpen(true)}
        onForgetDeviceKeys={async () => {
          if (!eventId) return
          await deleteDEK(eventId)
          setDek(null)
          setIsPassphrasePromptOpen(true)
          toast.success('Keys forgotten on this device')
          haptic.trigger("light")
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isE2EELocked ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-neutral-50/50 dark:bg-neutral-900/10">
            <LockKey size={48} className="mx-auto text-neutral-300 dark:text-neutral-700 mb-4" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              This event is end-to-end encrypted. Enter the passphrase above to view the photo gallery.
            </p>
          </div>
        ) : activeTab === 'connections' ? (
          <WhoWasIWith
            eventId={eventId!}
            favouritePhotoIds={favouritePhotoIds}
            onToggleFavourite={handleToggleFavourite}
          />
        ) : (
          <>
            {selectedAttendeeId && (
              <div className="mb-4 flex items-center">
                <Badge variant="secondary" className="flex items-center gap-2 w-fit py-3 px-3 bg-muted text-foreground text-sm">
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
              dek={dek}
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
        onCancelUpload={handleCancelUpload}
        uploading={uploading}
        fileStatuses={fileStatuses}
        userRole={event?.user_role}
        userUploadCount={photos.filter(p => p.user_id === user?.id || p.user?.id === user?.id).length}
        uploadLimit={event?.attendee_upload_limit}
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
        isOrganizer={isOrganizer}
        eventId={eventId}
        isSecure={isSecure}
        initialTab={attendeesModalTab}
        onRefreshAttendees={() => {
          queryClient.invalidateQueries({ queryKey: ['attendees', eventId] })
          queryClient.invalidateQueries({ queryKey: ['photos', eventId] })
          queryClient.invalidateQueries({ queryKey: ['join-requests-count', eventId] })
        }}
      />

      <EventSettingsModal
        open={settingsModalOpen}
        onOpenChange={setSettingsModalOpen}
        settingsForm={settingsForm}
        onSettingsFormChange={setSettingsForm}
        onSave={handleSaveSettings}
        saving={savingSettings}
        inviteCode={event?.invite_code}
        onRegenerateCode={handleRegenerateCode}
        photos={photos}
        encryptionMode={event?.encryption_mode}
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
        onOpenChange={(isOpen) => {
          setCarouselOpen(isOpen)
          if (!isOpen) {
            setHighlightCommentId(undefined)
            lastInvalidatedPhotoIdRef.current = null
          }
        }}
        photos={filteredPhotos}
        initialIndex={currentPhotoIndex}
        onDelete={handleDeletePhoto}
        currentUserId={user?.id}
        userRole={event?.user_role}
        isEventActive={event?.is_active}
        isFavourite={(photoId) => favouritePhotoIds.has(photoId)}
        onToggleFavourite={handleToggleFavourite}
        highlightCommentId={highlightCommentId}
        dek={dek}
      />

      <AnimatePresence>
        {showScrollTop && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="fixed z-40 left-1/2 -translate-x-1/2 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:bottom-8"
          >
            <Button
              variant="outline"
              size="icon"
              onClick={handleScrollToTop}
              className="rounded-full shadow-lg border border-border bg-background/90 backdrop-blur-md hover:bg-muted text-foreground cursor-pointer h-10 w-10 md:h-12 md:w-12 transition-all duration-200 hover:scale-105"
            >
              <CaretUp size={22} weight="bold" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {event && (
        <MomntsSlideshow
          open={slideshowOpen}
          onOpenChange={setSlideshowOpen}
          eventId={event.id}
          eventName={event.name}
          eventLocation={event.location}
          eventDate={event.date}
          dek={dek}
        />
      )}

      <ShareEventModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        event={event}
      />

      {event && event.encryption_mode === 'E2EE' && !dek && (
        <PassphrasePrompt
          open={isPassphrasePromptOpen}
          eventId={event.id}
          kdfSalt={event.kdf_salt}
          kdfParams={event.kdf_params}
          wrappedDek={event.wrapped_dek}
          wrappedDekIv={event.wrapped_dek_iv}
          wrappedDekTag={event.wrapped_dek_tag}
          recoveryKdfSalt={event.recovery_kdf_salt}
          wrappedRecoveryDek={event.wrapped_recovery_dek}
          wrappedRecoveryIv={event.wrapped_recovery_iv}
          wrappedRecoveryTag={event.wrapped_recovery_tag}
          onUnlockSuccess={(unwrappedDek) => {
            setDek(unwrappedDek)
            setIsPassphrasePromptOpen(false)
            queryClient.invalidateQueries({ queryKey: ['event', event.id] })
            queryClient.invalidateQueries({ queryKey: ['photos', event.id] })
          }}
          onBack={() => {
            setIsPassphrasePromptOpen(false)
            setTimeout(() => {
              navigate('/events')
            }, 150)
          }}
        />
      )}
    </div>
  )
}

export default EventDetails
