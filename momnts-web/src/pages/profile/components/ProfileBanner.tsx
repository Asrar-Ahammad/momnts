import { useRef, useState } from 'react'
import { Camera, Trash, CircleNotch, ImageSquare } from '@phosphor-icons/react'
import { usersApi } from '../../../features/users/services/users.api'
import { toast } from 'sonner'
import { useWebHaptics } from 'web-haptics/react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../../components/ui/alert-dialog'
import { Button } from '../../../components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '../../../components/ui/tooltip'
import BannerCropModal from './BannerCropModal'

interface ProfileBannerProps {
  bannerUrl?: string
  onBannerUpdate: (url: string | null) => void
}

const ProfileBanner = ({ bannerUrl, onBannerUpdate }: ProfileBannerProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCropModalOpen, setIsCropModalOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const haptic = useWebHaptics()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be smaller than 10MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string)
      setIsCropModalOpen(true)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    reader.readAsDataURL(file)
  }

  const handleCropComplete = async (croppedBlob: Blob) => {
    try {
      setIsUploading(true)
      haptic.trigger("medium")
      
      const file = new File([croppedBlob], 'banner.jpg', { type: 'image/jpeg' })
      const result = await usersApi.updateBanner(file)
      
      onBannerUpdate(result.banner_url)
      haptic.trigger("success")
      toast.success('Banner updated successfully')
      setIsCropModalOpen(false)
      setSelectedImage(null)
    } catch (error: any) {
      haptic.trigger("error")
      toast.error(error.message || 'Failed to update banner')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteBanner = async () => {
    try {
      setIsDeleting(true)
      haptic.trigger("warning")
      await usersApi.deleteBanner()
      onBannerUpdate(null)
      toast.success('Banner removed')
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete banner')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="relative w-full h-[180px] sm:h-[240px] rounded-none sm:rounded-t-3xl overflow-hidden group">
      {/* Banner Content */}
      {bannerUrl ? (
        <img
          src={bannerUrl}
          alt="Profile banner"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
        />
      ) : (
        <div
          className="w-full h-full [background-size:400%_400%] [animation:profile-gradient-shift_12s_ease_infinite]"
          style={{
            background: 'linear-gradient(135deg, #1a1a3e 0%, #4c1d95 25%, #7c3aed 50%, #db2777 75%, #1a1a3e 100%)',
          }}
        />
      )}

      {/* Overlay gradient for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

      {/* Loading overlay */}
      {(isUploading || isDeleting) && (
        <div className="absolute inset-0 z-20 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white">
          <CircleNotch size={32} weight="bold" className="animate-spin mb-2 drop-shadow-md" />
          <span className="text-sm font-semibold drop-shadow-md">
            {isUploading ? 'Updating banner...' : 'Removing banner...'}
          </span>
        </div>
      )}

      {/* Banner controls - visible on hover (or always on mobile) */}
      <div className={`absolute top-3 right-3 flex items-center gap-2 transition-opacity duration-300 ${
        isUploading || isDeleting ? 'opacity-0 pointer-events-none' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
      }`}>
        <Tooltip>
          <TooltipTrigger delay={0} render={
            <Button
              size="sm"
              variant="secondary"
              className="rounded-xl h-9 px-3 bg-black/50 hover:bg-black/70 text-white border-none backdrop-blur-md cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <CircleNotch size={16} weight="bold" className="animate-spin" />
              ) : (
                <>
                  <Camera size={16} weight="bold" className="mr-1.5" />
                  <span className="text-xs font-semibold">
                    {bannerUrl ? 'Change' : 'Upload'}
                  </span>
                </>
              )}
            </Button>
          } />
          <TooltipContent>{bannerUrl ? 'Change banner' : 'Upload banner'}</TooltipContent>
        </Tooltip>

        {bannerUrl && (
          <AlertDialog>
            <AlertDialogTrigger render={
              <Button
                size="sm"
                variant="secondary"
                className="rounded-xl h-9 w-9 p-0 bg-black/50 hover:bg-red-600/80 text-white border-none backdrop-blur-md cursor-pointer"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <CircleNotch size={16} weight="bold" className="animate-spin" />
                ) : (
                  <Trash size={16} weight="bold" />
                )}
              </Button>
            } />
            <AlertDialogContent className="rounded-3xl border-neutral-200 dark:border-neutral-800">
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Banner?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove your profile banner and replace it with the default gradient background.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel variant="outline" size="default" className="rounded-2xl border-neutral-200 dark:border-neutral-800" onClick={() => haptic.trigger("light")}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={isDeleting}
                  onClick={() => handleDeleteBanner()}
                  className="bg-red-500 hover:bg-red-600 text-white rounded-2xl"
                >
                  {isDeleting ? <CircleNotch size={18} className="animate-spin mr-2" /> : null}
                  {isDeleting ? 'Removing...' : 'Remove'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>



      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <BannerCropModal
        image={selectedImage}
        open={isCropModalOpen}
        onOpenChange={setIsCropModalOpen}
        onCropComplete={handleCropComplete}
        isUploading={isUploading}
      />
    </div>
  )
}

export default ProfileBanner
