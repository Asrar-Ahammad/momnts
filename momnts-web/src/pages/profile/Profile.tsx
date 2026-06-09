import { useState, useRef } from 'react'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { usersApi } from '../../features/users/services/users.api'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { useNavigate, Link } from 'react-router'
import { Tooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip'
import SelfieCropModal from './components/SelfieCropModal'
import SelfieUploadModal from './components/SelfieUploadModal'
import DevicesTab from './components/DevicesTab'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { motion } from 'motion/react'
import {
  User,
  Envelope,
  EnvelopeSimple,
  CalendarBlank,
  Camera,
  SignOut,
  ShieldCheck,
  CameraPlus,
  CircleNotch,
  PencilSimple,
  CheckCircle,
  WarningCircle,
  Key,
  X,
  UserCircle,
  Devices,
  Check,
  SmileyXEyesIcon,
  Gear,
  Lightning
} from '@phosphor-icons/react'
import { Switch } from '../../components/ui/switch'
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
import { authApi } from '../../features/auth/services/auth.api'
import { ChangePasswordModal } from './components/ChangePasswordModal'
import { useWebHaptics } from 'web-haptics/react'
import { useSubscription } from '../../features/subscription/hooks/useSubscription'

const Profile = () => {
  const { user, setUser, logout } = useAuth()
  const navigate = useNavigate()
  const haptic = useWebHaptics()
  const { plan, isPro } = useSubscription()
  const fileInputRef = useRef<HTMLInputElement>(null) // Add missing fileInputRef to avoid build issues if we can, or just keep original reference if profile uses one. Oh wait, L210 uses it, we should add a ref for it if it wasn't there. Let's look at original code: L75 has no fileInputRef declaration. So it was indeed a bug in original code or declared differently. Let's declare it to be safe.
  const [isUpdatingSelfie, setIsUpdatingSelfie] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)

  // Cropping states
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isCropModalOpen, setIsCropModalOpen] = useState(false)

  // Password reset modal
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false)
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false)
  const [isSendingChangeOtp, setIsSendingChangeOtp] = useState(false)

  // Email verification state
  const [isSendingOtp, setIsSendingOtp] = useState(false)

  // Name editing states
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [isUpdatingName, setIsUpdatingName] = useState(false)
  const [activeTab, setActiveTab] = useState('account')

  const [isUpdatingTheme, setIsUpdatingTheme] = useState(false)

  const [hapticsEnabled, setHapticsEnabled] = useState(() => {
    return localStorage.getItem('momnts_haptics_enabled') !== 'false'
  })

  const handleHapticsToggle = (checked: boolean) => {
    setHapticsEnabled(checked)
    localStorage.setItem('momnts_haptics_enabled', String(checked))
    if (checked) {
      haptic.trigger("success")
    }
  }

  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isDeletingSelfie, setIsDeletingSelfie] = useState(false)
  const isLoggingOutRef = useRef(false)
  const isSendingOtpRef = useRef(false)
  const isUpdatingNameRef = useRef(false)
  const isUpdatingSelfieRef = useRef(false)

  const handleLogout = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (isLoggingOutRef.current) return
    haptic.trigger("warning")
    try {
      isLoggingOutRef.current = true
      setIsLoggingOut(true);
      await logout()
      navigate("/login", { replace: true })
      toast.success("Logged out successfully")
    } catch (error) {
      console.error("Logout failed:", error)
      toast.error("Logout failed. Please try again.")
      isLoggingOutRef.current = false
      setIsLoggingOut(false)
    }
  }

  const handleDeleteSelfie = async () => {
    if (isDeletingSelfie) return
    try {
      setIsDeletingSelfie(true)
      await usersApi.deleteSelfie()
      if (user) {
        setUser({ ...user, selfie_url: null })
      }
      toast.success("Selfie deleted successfully")
    } catch (error: any) {
      console.error("Failed to delete selfie:", error)
      toast.error(error.message || "Failed to delete selfie")
    } finally {
      setIsDeletingSelfie(false)
    }
  }

  const handleVerifyEmail = async () => {
    if (isSendingOtpRef.current) return
    try {
      isSendingOtpRef.current = true
      setIsSendingOtp(true)
      await authApi.sendOtp()
      toast.success('Verification code sent to your email!')
      navigate('/verify-email')
    } catch (error: any) {
      toast.error(error.message || 'Failed to send verification code')
    } finally {
      isSendingOtpRef.current = false
      setIsSendingOtp(false)
    }
  }

  const handleConfirmWarning = async () => {
    try {
      setIsSendingChangeOtp(true)
      await authApi.sendChangePasswordOtp()
      toast.success("Verification code sent to your email")
      setIsWarningModalOpen(false)
      setIsChangePasswordModalOpen(true)
    } catch (error: any) {
      toast.error(error.message || "Failed to send verification code")
    } finally {
      setIsSendingChangeOtp(false)
    }
  }

  const handleSelfieClick = () => {
    haptic.trigger("medium")
    setIsUploadModalOpen(true)
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
    if (isUpdatingNameRef.current) return

    try {
      isUpdatingNameRef.current = true
      setIsUpdatingName(true)
      const colorToSave = user?.custom_accent_color
      await usersApi.updateProfile(editName.trim(), user?.theme, colorToSave)
      if (user) {
        setUser({ ...user, username: editName.trim(), custom_accent_color: colorToSave })
      }
      haptic.trigger("success")
      toast.success("Name updated successfully")
      setIsEditingName(false)
    } catch (error: any) {
      haptic.trigger("error")
      console.error("Failed to update name:", error)
      toast.error(error.message || "Failed to update name")
    } finally {
      isUpdatingNameRef.current = false
      setIsUpdatingName(false)
    }
  }

  const handleSaveTheme = async (newTheme: string, newColor?: string) => {
    if (!user) return
    try {
      setIsUpdatingTheme(true)
      const colorToSave = newColor || user?.custom_accent_color
      await usersApi.updateProfile(user.username, newTheme, colorToSave)
      setUser({ ...user, theme: newTheme, custom_accent_color: colorToSave })
      haptic.trigger("success")
    } catch (error: any) {
      toast.error("Failed to update theme")
    } finally {
      setIsUpdatingTheme(false)
    }
  }

  const handleImageSelected = (imageSrc: string) => {
    setSelectedImage(imageSrc)
    setIsCropModalOpen(true)
  }

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (isUpdatingSelfieRef.current) return
    const loadingToast = toast.loading("Updating your selfie...")

    try {
      isUpdatingSelfieRef.current = true
      setIsUpdatingSelfie(true)
      const file = new File([croppedBlob], 'selfie.jpg', { type: 'image/jpeg' })
      const result = await usersApi.updateSelfie(file)
      if (user) {
        setUser({ ...user, selfie_url: result.selfie_url })
      }
      haptic.trigger("success")
      toast.success("Selfie updated successfully! Face matching is now active.")
      setIsCropModalOpen(false)
      setSelectedImage(null)
    } catch (error: any) {
      haptic.trigger("error")
      console.error("Failed to update selfie:", error)
      toast.error(error.message || "Failed to update selfie")
    } finally {
      isUpdatingSelfieRef.current = false
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
    <div className="max-w-screen-xl md:max-w-4xl mx-auto px-4 sm:px-6 md:px-14 py-12 pb-24">
      <div className="relative mb-12 select-none">
        <h1 className="text-6xl font-bold text-neutral-900 dark:text-neutral-100 mb-2 font-sirage">Profile</h1>
        <p className="text-neutral-500 dark:text-neutral-400">Manage your account and biometric settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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



          <div className="hidden md:flex pt-4 w-full flex-col items-center justify-start gap-3">
            {user?.selfie_url && (
              <AlertDialog>
                <AlertDialogTrigger render={
                  <Button variant="ghost" className="w-full text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-2xl h-12 flex items-center justify-center gap-2">
                    <SmileyXEyesIcon size={20} weight="bold" />
                    Delete Selfie
                  </Button>
                } />
                <AlertDialogContent className="rounded-3xl border-neutral-200 dark:border-neutral-800">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Selfie?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete your selfie? This will remove your face profile, and you will no longer be automatically matched in event photos until you upload a new one.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel variant="outline" size="default" className="rounded-2xl border-neutral-200 dark:border-neutral-800" onClick={() => haptic.trigger("light")}>Cancel</AlertDialogCancel>
                    <AlertDialogAction disabled={isDeletingSelfie} onClick={() => { haptic.trigger("warning"); handleDeleteSelfie(); }} className="bg-red-500 hover:bg-red-600 text-white rounded-2xl">
                      {isDeletingSelfie ? <CircleNotch size={18} className="animate-spin mr-2" /> : null}
                      {isDeletingSelfie ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <AlertDialog>
              <AlertDialogTrigger render={
                <Button variant="ghost" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl h-12 flex items-center justify-center gap-2">
                  <SignOut size={20} weight="bold" />
                  Logout Session
                </Button>
              } />
              <AlertDialogContent className="rounded-3xl border-neutral-200 dark:border-neutral-800">
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You will need to sign in again to access your events and photos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel variant="outline" size="default" className="rounded-2xl border-neutral-200 dark:border-neutral-800" onClick={() => haptic.trigger("light")}>Cancel</AlertDialogCancel>
                  <AlertDialogAction disabled={isLoggingOut} onClick={(e) => { haptic.trigger("warning"); handleLogout(e); }} className="bg-red-500 hover:bg-red-600 text-white rounded-2xl">
                    {isLoggingOut ? <CircleNotch size={18} className="animate-spin mr-2" /> : null}
                    {isLoggingOut ? 'Logging out...' : 'Logout'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="md:col-span-2 w-full min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex w-full mb-8 bg-muted p-1 rounded-2xl h-14 items-stretch relative">
              <TabsTrigger value="account" className={`relative rounded-xl flex-1 text-base z-10 transition-colors duration-200 ${activeTab === 'account' ? '!text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {activeTab === 'account' && (
                  <motion.div
                    layoutId="profile-tab-pill"
                    className="absolute inset-0 bg-primary rounded-xl shadow-sm -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <UserCircle size={20} weight="fill" className="mr-2" />
                Account
              </TabsTrigger>
              <TabsTrigger value="devices" className={`relative rounded-xl flex-1 text-base z-10 transition-colors duration-200 ${activeTab === 'devices' ? '!text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {activeTab === 'devices' && (
                  <motion.div
                    layoutId="profile-tab-pill"
                    className="absolute inset-0 bg-primary rounded-xl shadow-sm -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Devices size={20} weight="fill" className="mr-2" />
                Devices
              </TabsTrigger>
              <TabsTrigger value="settings" className={`relative rounded-xl flex-1 text-base z-10 transition-colors duration-200 ${activeTab === 'settings' ? '!text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {activeTab === 'settings' && (
                  <motion.div
                    layoutId="profile-tab-pill"
                    className="absolute inset-0 bg-primary rounded-xl shadow-sm -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Gear size={20} weight="fill" className="mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="account" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div className="bg-card text-card-foreground border border-border rounded-[32px] p-6 sm:p-8 shadow-sm">
                  <h3 className="text-xl font-bold select-none mb-8 text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                    Account Information
                  </h3>

                  <div className="space-y-8">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-2xl text-neutral-500 dark:text-neutral-400">
                        <User size={24} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1 select-none">Full Name</p>
                        {isEditingName ? (
                          <div className="flex items-center gap-2 w-full">
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="h-9 text-lg font-semibold rounded-xl flex-1 min-w-0"
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
                          <div className="flex items-center gap-2 w-full min-w-0">
                            <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 capitalize truncate">{user.username}</p>
                            <button
                              onClick={handleStartEditingName}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:hover:text-neutral-300 transition-colors cursor-pointer"
                              aria-label="Edit name"
                            >
                              <PencilSimple size={14} weight="bold" />
                            </button>
                            <button
                              onClick={() => navigate('/pricing')}
                              className={`ml-auto px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${isPro
                                  ? 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-500/20'
                                  : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                }`}
                            >
                              {isPro ? (
                                <span className="flex items-center gap-1">
                                  <Lightning size={12} weight="fill" /> Pro
                                </span>
                              ) : (
                                'Free'
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-2xl text-neutral-500 dark:text-neutral-400">
                        <Envelope size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1 select-none">Email Address</p>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 break-all">{user.email}</p>
                          {user.email_verified ? (
                            <Tooltip>
                              <TooltipTrigger delay={0}>
                                <CheckCircle size={20} weight="fill" className="text-emerald-500" />
                              </TooltipTrigger>
                              <TooltipContent>Email verified</TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger delay={0}>
                                <WarningCircle size={20} weight="fill" className="text-amber-500" />
                              </TooltipTrigger>
                              <TooltipContent>Email not verified</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-2xl text-neutral-500 dark:text-neutral-400">
                        <CalendarBlank size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1 select-none">Member Since</p>
                        <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 break-words">{formatDate(user.created_at)}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-2xl text-neutral-500 dark:text-neutral-400">
                        <Key size={24} />
                      </div>
                      <div className="flex-1 min-w-0 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1 select-none">Password</p>
                          <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 break-words">••••••••</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => { haptic.trigger("medium"); setIsWarningModalOpen(true); }} className="rounded-xl font-semibold border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                          Change
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {!user.email_verified && (
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-[32px] p-6 sm:p-8">
                    <h4 className="text-blue-900 dark:text-blue-400 font-bold mb-2 flex items-center gap-2 text-lg">
                      <EnvelopeSimple size={24} weight="fill" />
                      Verify your email
                    </h4>
                    <p className="text-blue-800/80 dark:text-blue-400/80 mb-6 max-w-lg leading-relaxed">
                      Verify your email address to secure your account and unlock all features.
                    </p>
                    <Button
                      onClick={handleVerifyEmail}
                      disabled={isSendingOtp}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-11 px-8 font-bold border-none shadow-lg shadow-blue-500/20"
                    >
                      {isSendingOtp ? <CircleNotch size={18} className="animate-spin mr-2" /> : null}
                      {isSendingOtp ? 'Sending...' : 'Verify Email Now'}
                    </Button>
                  </div>
                )}

                {!user.selfie_url && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-[32px] p-6 sm:p-8">
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

                <div className="md:hidden pt-4 flex flex-col justify-center gap-3">
                  {user?.selfie_url && (
                    <AlertDialog>
                      <AlertDialogTrigger render={
                        <Button variant="ghost" className="w-full justify-center text-orange-500 rounded-2xl h-14 border border-red-100 dark:border-red-900/30">
                          <SmileyXEyesIcon size={36} weight="bold" className="mr-3" />
                          Delete Selfie
                        </Button>
                      } />
                      <AlertDialogContent className="rounded-3xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Selfie?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete your selfie? This will remove your face profile, and you will no longer be automatically matched in event photos until you upload a new one.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel variant="outline" size="default" className="rounded-2xl" onClick={() => haptic.trigger("light")}>Cancel</AlertDialogCancel>
                          <AlertDialogAction disabled={isDeletingSelfie} onClick={() => { haptic.trigger("warning"); handleDeleteSelfie(); }} className="bg-red-500 hover:bg-red-600 text-white rounded-2xl">
                            {isDeletingSelfie ? <CircleNotch size={18} className="animate-spin mr-2" /> : null}
                            {isDeletingSelfie ? 'Deleting...' : 'Delete'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}

                  <AlertDialog>
                    <AlertDialogTrigger render={
                      <Button variant="ghost" className="w-full justify-center text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl h-14 border border-red-100 dark:border-red-900/30">
                        <SignOut size={22} weight="bold" className="mr-3" />
                        Logout Session
                      </Button>
                    } />
                    <AlertDialogContent className="rounded-3xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Logout Session?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to end your current session?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel variant="outline" size="default" className="rounded-2xl" onClick={() => haptic.trigger("light")}>Cancel</AlertDialogCancel>
                        <AlertDialogAction disabled={isLoggingOut} onClick={(e) => { haptic.trigger("warning"); handleLogout(e); }} className="bg-red-500 hover:bg-red-600 text-white rounded-2xl">
                          {isLoggingOut ? <CircleNotch size={18} className="animate-spin mr-2" /> : null}
                          {isLoggingOut ? 'Logging out...' : 'Logout'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="devices" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <DevicesTab />
              </motion.div>
            </TabsContent>

            <TabsContent value="settings" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="bg-card text-card-foreground border border-border rounded-[32px] p-6 sm:p-8 shadow-sm">
                <div className="md:hidden">
                  <div className="mb-8">
                    <h3 className="text-xl font-bold select-none text-neutral-900 dark:text-neutral-100 mb-2">
                      App Settings
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Customize your experience on Momnts.
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-neutral-100 dark:border-neutral-800 rounded-2xl bg-neutral-50/30 dark:bg-neutral-900/10">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-850 text-neutral-500">
                        <Gear size={18} weight="bold" />
                      </div>
                      <div>
                        <label htmlFor="haptics-toggle" className="text-xs font-bold cursor-pointer text-neutral-900 dark:text-neutral-100">
                          Haptic Feedback
                        </label>
                        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">Enable physical vibration feedback for actions</p>
                      </div>
                    </div>
                    <Switch
                      id="haptics-toggle"
                      checked={hapticsEnabled}
                      onCheckedChange={handleHapticsToggle}
                      className="cursor-pointer"
                    />
                  </div>
                </div>
                  
                  <div className="mt-8 mb-6">
                    <h3 className="text-xl font-bold select-none text-neutral-900 dark:text-neutral-100 mb-2">
                      Appearance
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Choose a theme for the application.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    {[
                      { id: 'default', name: 'Default', color: '#171717', border: '#e5e5e5' },
                      { id: 'earthy', name: 'Earthy', color: '#748b6f', border: '#d9e0d7' },
                      { id: 'ocean', name: 'Ocean', color: '#0f4c81', border: '#33658a' },
                      { id: 'pastel', name: 'Pastel', color: '#fbcfe8', border: '#f9a8d4' },
                      { id: 'cyberpunk', name: 'Cyberpunk', color: '#00ffff', border: '#0891b2' },
                      { id: 'cognitive', name: 'Cognitive', color: '#d97757', border: '#b85f42' }
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleSaveTheme(t.id)}
                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                          (user?.theme || 'default') === t.id 
                            ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800' 
                            : 'border-transparent bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800'
                        }`}
                      >
                        <div 
                          className="w-10 h-10 rounded-full mb-3 shadow-sm border-2" 
                          style={{ backgroundColor: t.color, borderColor: t.border }}
                        />
                        <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                          {t.name}
                        </span>
                      </button>
                    ))}
                  </div>

                </div>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <SelfieCropModal
        image={selectedImage}
        open={isCropModalOpen}
        onOpenChange={setIsCropModalOpen}
        onCropComplete={handleCropComplete}
        isUploading={isUpdatingSelfie}
      />
      <SelfieUploadModal
        open={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        onImageSelected={handleImageSelected}
      />
      <ChangePasswordModal open={isChangePasswordModalOpen} onOpenChange={setIsChangePasswordModalOpen} initialStep={2} />

      <AlertDialog open={isWarningModalOpen} onOpenChange={setIsWarningModalOpen}>
        <AlertDialogContent className="rounded-3xl border-neutral-200 dark:border-neutral-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password Warning</AlertDialogTitle>
            <AlertDialogDescription>
              Resetting your password will invalidate all active sessions and log you out of all devices, including this one. You will need to log back in with your new password.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline" className="rounded-2xl" disabled={isSendingChangeOtp} onClick={() => haptic.trigger("light")}>Cancel</AlertDialogCancel>
            <Button
              onClick={() => { haptic.trigger("warning"); handleConfirmWarning(); }}
              disabled={isSendingChangeOtp}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-bold cursor-pointer"
            >
              {isSendingChangeOtp ? <CircleNotch size={18} className="animate-spin mr-2" /> : null}
              {isSendingChangeOtp ? "Sending Code..." : "Confirm & Send Code"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mt-16 pt-8 border-t border-neutral-100 dark:border-neutral-800 text-center text-xs text-neutral-400 dark:text-neutral-500 flex flex-wrap justify-center gap-x-4 gap-y-2">
        <Link to="/privacy" className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">Privacy Policy</Link>
        <span>&bull;</span>
        <Link to="/terms" className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">Terms and Conditions</Link>
        <span>&bull;</span>
        <span>&copy; {new Date().getFullYear()} Momnts</span>
      </div>
    </div>
  )
}

export default Profile