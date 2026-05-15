import { useState, useRef } from 'react'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { usersApi } from '../../features/users/services/users.api'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { useNavigate } from 'react-router'
import { Tooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip'
import SelfieCropModal from './components/SelfieCropModal'
import {
  User,
  Envelope,
  CalendarBlank,
  Camera,
  SignOut,
  ShieldCheck,
  CameraPlus,
  CircleNotch,
  PencilSimple,
  Check,
  X
} from '@phosphor-icons/react'
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
} from '../../components/ui/alert-dialog'
import { toast } from 'sonner'

const Profile = () => {
  const { user, setUser, logout } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUpdatingSelfie, setIsUpdatingSelfie] = useState(false)

  // Cropping states
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isCropModalOpen, setIsCropModalOpen] = useState(false)

  // Name editing states
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [isUpdatingName, setIsUpdatingName] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
      navigate("/login", { replace: true })
      toast.success("Logged out successfully")
    } catch (error) {
      console.error("Logout failed:", error)
      toast.error("Logout failed. Please try again.")
    }
  }

  const handleSelfieClick = () => {
    fileInputRef.current?.click()
  }

  const handleStartEditingName = () => {
    setEditName(user?.username || '')
    setIsEditingName(true)
  }

  const handleCancelEditingName = () => {
    setIsEditingName(false)
    setEditName('')
  }

  const handleSaveName = async () => {
    if (!editName.trim() || editName.trim() === user?.username) {
      setIsEditingName(false)
      return
    }

    setIsUpdatingName(true)
    try {
      const result = await usersApi.updateProfile(editName.trim())
      if (user) {
        setUser({ ...user, username: result.name })
      }
      toast.success("Name updated successfully")
      setIsEditingName(false)
    } catch (error: any) {
      console.error("Failed to update name:", error)
      toast.error(error.message || "Failed to update name")
    } finally {
      setIsUpdatingName(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setSelectedImage(reader.result as string)
      setIsCropModalOpen(true)
    }
    reader.readAsDataURL(file)
  }

  const handleCropComplete = async (croppedBlob: Blob) => {
    setIsUpdatingSelfie(true)
    const loadingToast = toast.loading("Updating your selfie...")

    try {
      const file = new File([croppedBlob], 'selfie.jpg', { type: 'image/jpeg' })
      const result = await usersApi.updateSelfie(file)
      if (user) {
        setUser({ ...user, selfie_url: result.selfie_url })
      }
      toast.success("Selfie updated successfully! Face matching is now active.")
      setIsCropModalOpen(false)
      setSelectedImage(null)
    } catch (error: any) {
      console.error("Failed to update selfie:", error)
      toast.error(error.message || "Failed to update selfie")
    } finally {
      setIsUpdatingSelfie(false)
      toast.dismiss(loadingToast)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <CircleNotch size={32} className="animate-spin text-neutral-400" />
      </div>
    )
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
      day: 'numeric'
    })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="relative mb-12">
        <h1 className="text-6xl font-bold text-neutral-900 dark:text-neutral-100 mb-2 font-sirage">Profile</h1>
        <p className="text-neutral-500 dark:text-neutral-400">Manage your account and biometric settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Avatar & Quick Actions */}
        <div className="space-y-6">
          <div className="relative group mx-auto md:mx-0 w-48 h-48 sm:w-56 sm:h-56">
            <div className="w-full h-full rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 border-4 border-white dark:border-neutral-900 shadow-xl relative ring-1 ring-neutral-200 dark:ring-neutral-800">
              {user.selfie_url ? (
                <img 
                  src={user.selfie_url} 
                  alt={user.username} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-neutral-50 dark:bg-neutral-800 text-neutral-300">
                  <User size={80} weight="duotone" />
                </div>
              )}
              
            </div>

            {/* Edit button - bottom left */}
            <button
              onClick={handleSelfieClick}
              disabled={isUpdatingSelfie}
              className="absolute bottom-2 left-2 rounded-full bg-white dark:bg-neutral-900 p-1 shadow-lg border border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <div className="flex items-center p-3 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                {isUpdatingSelfie ? (
                  <CircleNotch size={14} weight="bold" className="animate-spin" />
                ) : (
                  <Tooltip>
                    <TooltipTrigger delay={0} render={<span />}>
                     <CameraPlus size={14} weight="bold" />
                  </TooltipTrigger>
                  <TooltipContent className="cursor-pointer">
                    Update photo
                  </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </button>

            {/* Selfie status badge */}
            <div className="absolute top-2 right-2 rounded-full bg-white dark:bg-neutral-900 p-1 shadow-lg border border-neutral-100 dark:border-neutral-800">
              <div className={`flex items-center gap-1.5 p-3 rounded-full text-[10px] font-bold uppercase tracking-tight ${user.selfie_url ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'}`}>
                {user.selfie_url ? (
                  <>
                  <Tooltip>
                    <TooltipTrigger delay={0}>
                    <ShieldCheck size={14} weight="bold" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Verified
                    </TooltipContent>
                    </Tooltip>
                  </>
                ) : (
                  <>
                  <Tooltip>
                    <TooltipTrigger delay={0}>
                    <Camera size={14} weight="bold" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Upload to Verify
                    </TooltipContent>
                    </Tooltip>
                  </>
                )}
              </div>
            </div>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />

          <div className="hidden md:flex pt-4 w-full items-center justify-start">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl h-12 flex items-center justify-center gap-2">
                  <SignOut size={20} weight="bold" />
                  Logout Session
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl border-neutral-200 dark:border-neutral-800">
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You will need to sign in again to access your events and photos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-2xl border-neutral-200 dark:border-neutral-800">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white rounded-2xl">
                    Logout
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Right Column: Account Details */}
        <div className="md:col-span-2 space-y-8">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] p-8 shadow-sm">
            <h3 className="text-xl font-bold mb-8 text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              Account Information
            </h3>
            
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-2xl text-neutral-500 dark:text-neutral-400">
                  <User size={24} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1">Full Name</p>
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-9 text-lg font-semibold rounded-xl"
                        disabled={isUpdatingName}
                        maxLength={50}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveName()
                          if (e.key === 'Escape') handleCancelEditingName()
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveName}
                        disabled={isUpdatingName || !editName.trim()}
                        className="rounded-xl h-9 w-9 p-0"
                      >
                        {isUpdatingName ? (
                          <CircleNotch size={16} className="animate-spin" />
                        ) : (
                          <Check size={16} weight="bold" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEditingName}
                        disabled={isUpdatingName}
                        className="rounded-xl h-9 w-9 p-0"
                      >
                        <X size={16} weight="bold" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 capitalize">{user.username}</p>
                      <button
                        onClick={handleStartEditingName}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:hover:text-neutral-300 transition-colors cursor-pointer"
                        aria-label="Edit name"
                      >
                        <PencilSimple size={14} weight="bold" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-2xl text-neutral-500 dark:text-neutral-400">
                  <Envelope size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1">Email Address</p>
                  <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{user.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-2xl text-neutral-500 dark:text-neutral-400">
                  <CalendarBlank size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1">Member Since</p>
                  <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{formatDate(user.created_at)}</p>
                </div>
              </div>
            </div>
          </div>

          {!user.selfie_url && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-[32px] p-8">
              <h4 className="text-amber-900 dark:text-amber-400 font-bold mb-2 flex items-center gap-2 text-lg">
                <Camera size={24} weight="fill" />
                Finish setting up your profile
              </h4>
              <p className="text-amber-800/80 dark:text-amber-400/80 mb-6 max-w-lg leading-relaxed">
                Add a clear selfie to your profile. This allows Momnts to find photos of you in every event you participate in, instantly.
              </p>
              <Button 
                onClick={handleSelfieClick}
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-2xl h-11 px-8 font-bold border-none shadow-lg shadow-amber-500/20"
              >
                Upload Selfie Now
              </Button>
            </div>
          )}

          {/* Mobile Logout Button */}
          <div className="md:hidden pt-4 flex justify-center">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="w-full justify-center text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl h-14 border border-red-100 dark:border-red-900/30">
                  <SignOut size={22} weight="bold" className="mr-3" />
                  Logout Session
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Logout Session?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to end your current session?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-2xl">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white rounded-2xl">
                    Logout
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
      <SelfieCropModal
        image={selectedImage}
        open={isCropModalOpen}
        onOpenChange={setIsCropModalOpen}
        onCropComplete={handleCropComplete}
        isUploading={isUpdatingSelfie}
      />
    </div>
  )
}

export default Profile