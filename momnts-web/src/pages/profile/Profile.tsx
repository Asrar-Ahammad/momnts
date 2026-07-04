import { useState, useRef } from 'react'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { usersApi } from '../../features/users/services/users.api'
import { useNavigate, Link } from 'react-router'
import { motion } from 'motion/react'
import { CircleNotch, UserCircle, Devices, Gear } from '@phosphor-icons/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { toast } from 'sonner'
import { authApi } from '../../features/auth/services/auth.api'
import { useWebHaptics } from 'web-haptics/react'
import { useSubscription } from '../../features/subscription/hooks/useSubscription'

// Sub-components
import ProfileBanner from './components/ProfileBanner'
import ProfileAvatar from './components/ProfileAvatar'
import ProfileHeader from './components/ProfileHeader'
import AccountTab from './components/AccountTab'
import SettingsTab from './components/SettingsTab'
import DevicesTab from './components/DevicesTab'
import SelfieCropModal from './components/SelfieCropModal'
import SelfieUploadModal from './components/SelfieUploadModal'
import { ChangePasswordModal } from './components/ChangePasswordModal'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog'
import { Button } from '../../components/ui/button'

const Profile = () => {
  const { user, setUser, logout } = useAuth()
  const navigate = useNavigate()
  const haptic = useWebHaptics()
  const { isPro } = useSubscription()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Tab state
  const [activeTab, setActiveTab] = useState('account')

  // Selfie states
  const [isUpdatingSelfie, setIsUpdatingSelfie] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isCropModalOpen, setIsCropModalOpen] = useState(false)
  const [isDeletingSelfie, setIsDeletingSelfie] = useState(false)

  // Password / warning modal states
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false)
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false)
  const [isSendingChangeOtp, setIsSendingChangeOtp] = useState(false)

  // Email verification state
  const [isSendingOtp, setIsSendingOtp] = useState(false)

  // Name editing states
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [isUpdatingName, setIsUpdatingName] = useState(false)

  // Theme state
  const [isUpdatingTheme, setIsUpdatingTheme] = useState(false)

  // Haptics state
  const [hapticsEnabled, setHapticsEnabled] = useState(() =>
    localStorage.getItem('momnts_haptics_enabled') !== 'false'
  )

  // Logout state
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Ref guards to prevent double-submission
  const isLoggingOutRef = useRef(false)
  const isSendingOtpRef = useRef(false)
  const isUpdatingNameRef = useRef(false)
  const isUpdatingSelfieRef = useRef(false)

  // ─── Handlers ─────────────────────────────────────────────────────────

  const handleBannerUpdate = (url: string | null) => {
    if (user) setUser({ ...user, banner_url: url ?? undefined })
  }

  const handleHapticsToggle = (checked: boolean) => {
    setHapticsEnabled(checked)
    localStorage.setItem('momnts_haptics_enabled', String(checked))
    if (checked) haptic.trigger('success')
  }

  const handleLogout = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    if (isLoggingOutRef.current) return
    haptic.trigger('warning')
    try {
      isLoggingOutRef.current = true
      setIsLoggingOut(true)
      await logout()
      navigate('/login', { replace: true })
      toast.success('Logged out successfully')
    } catch {
      toast.error('Logout failed. Please try again.')
      isLoggingOutRef.current = false
      setIsLoggingOut(false)
    }
  }

  const handleDeleteSelfie = async () => {
    if (isDeletingSelfie) return
    try {
      setIsDeletingSelfie(true)
      await usersApi.deleteSelfie()
      if (user) setUser({ ...user, selfie_url: undefined })
      toast.success('Selfie deleted successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete selfie')
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
      toast.success('Verification code sent to your email')
      setIsWarningModalOpen(false)
      setIsChangePasswordModalOpen(true)
    } catch (error: any) {
      toast.error(error.message || 'Failed to send verification code')
    } finally {
      setIsSendingChangeOtp(false)
    }
  }

  const handleSelfieClick = () => {
    haptic.trigger('medium')
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
      if (user) setUser({ ...user, username: editName.trim(), custom_accent_color: colorToSave })
      haptic.trigger('success')
      toast.success('Name updated successfully')
      setIsEditingName(false)
    } catch (error: any) {
      haptic.trigger('error')
      toast.error(error.message || 'Failed to update name')
    } finally {
      isUpdatingNameRef.current = false
      setIsUpdatingName(false)
    }
  }

  const handleSaveTheme = async (newTheme: string, newColor?: string): Promise<boolean> => {
    if (!user) return false
    try {
      setIsUpdatingTheme(true)
      const colorToSave = newColor || user?.custom_accent_color
      await usersApi.updateProfile(user.username, newTheme, colorToSave)
      setUser({ ...user, theme: newTheme, custom_accent_color: colorToSave })
      haptic.trigger('success')
      return true
    } catch {
      toast.error('Failed to update theme')
      return false
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
    const loadingToast = toast.loading('Updating your selfie...')
    try {
      isUpdatingSelfieRef.current = true
      setIsUpdatingSelfie(true)
      const file = new File([croppedBlob], 'selfie.jpg', { type: 'image/jpeg' })
      const result = await usersApi.updateSelfie(file)
      if (user) setUser({ ...user, selfie_url: result.selfie_url })
      haptic.trigger('success')
      toast.success('Selfie updated successfully! Face matching is now active.')
      setIsCropModalOpen(false)
      setSelectedImage(null)
    } catch (error: any) {
      haptic.trigger('error')
      toast.error(error.message || 'Failed to update selfie')
    } finally {
      isUpdatingSelfieRef.current = false
      setIsUpdatingSelfie(false)
      toast.dismiss(loadingToast)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ─── Loading state ─────────────────────────────────────────────────────

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <CircleNotch size={32} className="animate-spin text-neutral-400" />
      </div>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="max-w-screen-xl md:max-w-3xl mx-auto pb-12">

      {/* ── Hero: Banner + Avatar + Header ──────────────────────────────── */}
      <div className="rounded-none sm:rounded-3xl overflow-hidden mb-8 border-y sm:border-x border-neutral-100 dark:border-neutral-800 shadow-sm">
        {/* Banner */}
        <ProfileBanner
          bannerUrl={user.banner_url}
          onBannerUpdate={handleBannerUpdate}
        />

        {/* Avatar + Header row */}
        <div className="px-6 sm:px-10 pb-8 sm:pb-10 bg-white dark:bg-neutral-950">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-5">
            {/* Avatar — negative margin creates the overlap with the banner */}
            <div className="shrink-0 z-10 -mt-14 sm:-mt-16">
              <ProfileAvatar
                selfieUrl={user.selfie_url}
                username={user.username}
                isUpdatingSelfie={isUpdatingSelfie}
                onSelfieClick={handleSelfieClick}
              />
            </div>

            {/* Header — stays below the banner, aligned to avatar bottom */}
            <div className="flex-1 min-w-0 sm:pb-1">
              <ProfileHeader
                username={user.username}
                email={user.email}
                emailVerified={user.email_verified}
                memberSince={user.created_at}
                hasSelfie={!!user.selfie_url}
                isPro={isPro}
                isEditingName={isEditingName}
                editName={editName}
                isUpdatingName={isUpdatingName}
                onStartEditingName={handleStartEditingName}
                onCancelEditingName={handleCancelEditingName}
                onSaveName={handleSaveName}
                onEditNameChange={setEditName}
                onNavigatePricing={() => navigate('/pricing')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex w-full mb-6 bg-neutral-100/80 dark:bg-neutral-900/60 backdrop-blur-sm p-1 rounded-2xl h-12 items-stretch relative border border-neutral-200/50 dark:border-neutral-800/50">
            <TabsTrigger
              value="account"
              className={`relative rounded-xl flex-1 text-sm z-10 transition-colors duration-200 ${activeTab === 'account' ? '!text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {activeTab === 'account' && (
                <motion.div
                  layoutId="profile-tab-pill"
                  className="absolute inset-0 bg-primary rounded-xl shadow-sm -z-10"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <UserCircle size={18} weight="fill" className="mr-1.5" />
              Account
            </TabsTrigger>

            <TabsTrigger
              value="devices"
              className={`relative rounded-xl flex-1 text-sm z-10 transition-colors duration-200 ${activeTab === 'devices' ? '!text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {activeTab === 'devices' && (
                <motion.div
                  layoutId="profile-tab-pill"
                  className="absolute inset-0 bg-primary rounded-xl shadow-sm -z-10"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Devices size={18} weight="fill" className="mr-1.5" />
              Devices
            </TabsTrigger>

            <TabsTrigger
              value="settings"
              className={`relative rounded-xl flex-1 text-sm z-10 transition-colors duration-200 ${activeTab === 'settings' ? '!text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {activeTab === 'settings' && (
                <motion.div
                  layoutId="profile-tab-pill"
                  className="absolute inset-0 bg-primary rounded-xl shadow-sm -z-10"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Gear size={18} weight="fill" className="mr-1.5" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Account Tab */}
          <TabsContent value="account" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <AccountTab
              username={user.username}
              email={user.email}
              emailVerified={user.email_verified}
              memberSince={user.created_at}
              selfieUrl={user.selfie_url}
              isPro={isPro}
              isEditingName={isEditingName}
              editName={editName}
              isUpdatingName={isUpdatingName}
              onStartEditingName={handleStartEditingName}
              onCancelEditingName={handleCancelEditingName}
              onSaveName={handleSaveName}
              onEditNameChange={setEditName}
              onNavigatePricing={() => navigate('/pricing')}
              onChangePassword={() => { haptic.trigger('medium'); setIsWarningModalOpen(true) }}
              onVerifyEmail={handleVerifyEmail}
              onDeleteSelfie={handleDeleteSelfie}
              onSelfieClick={handleSelfieClick}
              onLogout={handleLogout}
              isSendingOtp={isSendingOtp}
              isDeletingSelfie={isDeletingSelfie}
              isLoggingOut={isLoggingOut}
            />
          </TabsContent>

          {/* Devices Tab */}
          <TabsContent value="devices" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <DevicesTab />
            </motion.div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <SettingsTab
              currentTheme={user.theme || 'default'}
              onSaveTheme={handleSaveTheme}
              isUpdatingTheme={isUpdatingTheme}
              hapticsEnabled={hapticsEnabled}
              onHapticsToggle={handleHapticsToggle}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div className="mt-16 pt-8 border-t border-neutral-100 dark:border-neutral-800 text-center text-xs text-neutral-400 dark:text-neutral-500 flex flex-wrap justify-center gap-x-4 gap-y-2 px-4">
        <Link to="/privacy" className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">Privacy Policy</Link>
        <span>&bull;</span>
        <Link to="/terms" className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">Terms and Conditions</Link>
        <span>&bull;</span>
        <span>&copy; {new Date().getFullYear()} Momnts</span>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
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
      <ChangePasswordModal
        open={isChangePasswordModalOpen}
        onOpenChange={setIsChangePasswordModalOpen}
        initialStep={2}
      />

      {/* Change Password Warning Modal */}
      <AlertDialog open={isWarningModalOpen} onOpenChange={setIsWarningModalOpen}>
        <AlertDialogContent className="rounded-3xl border-neutral-200 dark:border-neutral-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password Warning</AlertDialogTitle>
            <AlertDialogDescription>
              Resetting your password will invalidate all active sessions and log you out of all devices, including this one. You will need to log back in with your new password.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline" className="rounded-2xl" disabled={isSendingChangeOtp} onClick={() => haptic.trigger('light')}>Cancel</AlertDialogCancel>
            <Button
              onClick={() => { haptic.trigger('warning'); handleConfirmWarning() }}
              disabled={isSendingChangeOtp}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-bold cursor-pointer"
            >
              {isSendingChangeOtp ? <CircleNotch size={18} className="animate-spin mr-2" /> : null}
              {isSendingChangeOtp ? 'Sending Code...' : 'Confirm & Send Code'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default Profile