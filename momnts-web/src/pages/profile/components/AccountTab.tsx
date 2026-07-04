import {
  Key,
  Camera,
  SignOut,
  SmileyXEyes,
  CircleNotch,
  EnvelopeSimple,
} from '@phosphor-icons/react'
import { Button } from '../../../components/ui/button'
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
import { motion } from 'motion/react'
import { useWebHaptics } from 'web-haptics/react'

interface AccountTabProps {
  // We keep the props the same so Profile.tsx doesn't break
  username: string
  email: string
  emailVerified: boolean
  memberSince?: string
  selfieUrl?: string
  isPro: boolean
  // Name editing
  isEditingName: boolean
  editName: string
  isUpdatingName: boolean
  onStartEditingName: () => void
  onCancelEditingName: () => void
  onSaveName: () => void
  onEditNameChange: (name: string) => void
  // Actions
  onNavigatePricing: () => void
  onChangePassword: () => void
  onVerifyEmail: () => void
  onDeleteSelfie: () => void
  onSelfieClick: () => void
  onLogout: (e?: React.MouseEvent) => void
  // Loading states
  isSendingOtp: boolean
  isDeletingSelfie: boolean
  isLoggingOut: boolean
}

const AccountTab = ({
  emailVerified,
  selfieUrl,
  onChangePassword,
  onVerifyEmail,
  onDeleteSelfie,
  onSelfieClick,
  onLogout,
  isSendingOtp,
  isDeletingSelfie,
  isLoggingOut,
}: AccountTabProps) => {
  const haptic = useWebHaptics()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Email Verification CTA */}
      {!emailVerified && (
        <div className="bg-blue-50/80 dark:bg-blue-950/30 backdrop-blur-xl border border-blue-200/40 dark:border-blue-800/20 shadow-sm rounded-3xl p-6 sm:p-8">
          <h4 className="text-blue-900 dark:text-blue-400 font-bold mb-2 flex items-center gap-2 text-lg">
            <EnvelopeSimple size={22} weight="fill" />
            Verify your email
          </h4>
          <p className="text-blue-800/80 dark:text-blue-400/80 mb-5 max-w-lg leading-relaxed text-sm">
            Verify your email address to secure your account and unlock all features.
          </p>
          <Button
            onClick={onVerifyEmail}
            disabled={isSendingOtp}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-10 px-6 font-bold border-none shadow-lg shadow-blue-500/20"
          >
            {isSendingOtp ? <CircleNotch size={18} className="animate-spin mr-2" /> : null}
            {isSendingOtp ? 'Sending...' : 'Verify Email Now'}
          </Button>
        </div>
      )}

      {/* Selfie Setup CTA */}
      {!selfieUrl && (
        <div className="bg-amber-50/80 dark:bg-amber-950/30 backdrop-blur-xl border border-amber-200/40 dark:border-amber-800/20 shadow-sm rounded-3xl p-6 sm:p-8">
          <h4 className="text-amber-900 dark:text-amber-400 font-bold mb-2 flex items-center gap-2 text-lg">
            <Camera size={22} weight="fill" />
            Finish setting up your profile
          </h4>
          <p className="text-amber-800/80 dark:text-amber-400/80 mb-5 max-w-lg leading-relaxed text-sm">
            Add a clear selfie to your profile. This allows Momnts to find photos of you in every event you participate in, instantly.
          </p>
          <Button
            onClick={onSelfieClick}
            className="bg-amber-600 hover:bg-amber-700 text-white rounded-2xl h-10 px-6 font-bold border-none shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            Upload Selfie Now
          </Button>
        </div>
      )}

      {/* Account Actions */}
      <div className="bg-white/75 dark:bg-neutral-900/80 backdrop-blur-xl border border-black/[0.07] dark:border-white/[0.07] shadow-sm dark:shadow-lg rounded-3xl p-6 sm:p-8">
        <h3 className="text-lg font-bold select-none mb-6 text-neutral-900 dark:text-neutral-100">
          Account Actions
        </h3>
        
        <div className="space-y-3">
          {/* Change Password */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-neutral-500 dark:text-neutral-400">
                <Key size={20} weight="fill" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Change Password</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Secure your account</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { haptic.trigger("medium"); onChangePassword() }}
              className="rounded-full font-semibold border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              Change
            </Button>
          </div>

          {/* Delete Selfie */}
          {selfieUrl && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 group">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl text-orange-500 transition-transform group-hover:scale-110">
                  <SmileyXEyes size={20} weight="fill" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Delete Selfie</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Remove your face profile</p>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger className="inline-flex items-center justify-center rounded-full text-sm font-semibold border border-orange-200 dark:border-orange-900/50 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-600 dark:text-orange-400 h-9 px-3 cursor-pointer transition-colors outline-none bg-transparent">
                  Delete
                </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl border-neutral-200 dark:border-neutral-800">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Selfie?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete your selfie? This will remove your face profile, and you will no longer be automatically matched in event photos until you upload a new one.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel variant="outline" size="default" className="rounded-2xl border-neutral-200 dark:border-neutral-800 cursor-pointer" onClick={() => haptic.trigger("light")}>Cancel</AlertDialogCancel>
                  <AlertDialogAction disabled={isDeletingSelfie} onClick={() => { haptic.trigger("warning"); onDeleteSelfie() }} className="bg-red-500 hover:bg-red-600 text-white rounded-2xl cursor-pointer">
                    {isDeletingSelfie ? <CircleNotch size={18} className="animate-spin mr-2" /> : null}
                    {isDeletingSelfie ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {/* Logout */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 group">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-500 transition-transform group-hover:scale-110">
                <SignOut size={20} weight="fill" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Logout</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Sign out of this device</p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger className="inline-flex items-center justify-center rounded-full text-sm font-semibold border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 h-9 px-3 cursor-pointer transition-colors outline-none bg-transparent">
                Logout
              </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl border-neutral-200 dark:border-neutral-800">
              <AlertDialogHeader>
                <AlertDialogTitle>Logout Session?</AlertDialogTitle>
                <AlertDialogDescription>
                  You will need to sign in again to access your events and photos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel variant="outline" size="default" className="rounded-2xl border-neutral-200 dark:border-neutral-800 cursor-pointer" onClick={() => haptic.trigger("light")}>Cancel</AlertDialogCancel>
                <AlertDialogAction disabled={isLoggingOut} onClick={(e) => { haptic.trigger("warning"); onLogout(e) }} className="bg-red-500 hover:bg-red-600 text-white rounded-2xl cursor-pointer">
                  {isLoggingOut ? <CircleNotch size={18} className="animate-spin mr-2" /> : null}
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default AccountTab
