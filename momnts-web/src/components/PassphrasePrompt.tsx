import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Key, ShieldCheck, ArrowLeft, Warning } from '@phosphor-icons/react'
import {
  unlockWithPassphrase,
  unlockWithRecoveryKey,
  rewrapWithNewPassphrase,
  KDFParams
} from '@/lib/crypto/e2ee'
import { storeDEK } from '@/lib/crypto/keyStore'
import { setPassphrase } from '@/lib/crypto/passphraseCache'
import { eventsApi } from '@/features/events/services/events.api'
import { toast } from 'sonner'
import { useWebHaptics } from 'web-haptics/react'

interface PassphrasePromptProps {
  open: boolean
  eventId: string
  kdfSalt?: string
  kdfParams?: Record<string, unknown>
  wrappedDek?: string
  wrappedDekIv?: string
  wrappedDekTag?: string
  recoveryKdfSalt?: string
  wrappedRecoveryDek?: string
  wrappedRecoveryIv?: string
  wrappedRecoveryTag?: string
  onUnlockSuccess: (dek: CryptoKey) => void
  onBack?: () => void
}

export default function PassphrasePrompt({
  open,
  eventId,
  kdfSalt,
  kdfParams,
  wrappedDek,
  wrappedDekIv,
  wrappedDekTag,
  recoveryKdfSalt,
  wrappedRecoveryDek,
  wrappedRecoveryIv,
  wrappedRecoveryTag,
  onUnlockSuccess,
  onBack
}: PassphrasePromptProps) {
  const haptic = useWebHaptics()
  const [passphrase, setPassphrase] = useState('')
  const [recoveryKey, setRecoveryKey] = useState('')
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)
  const [isResetMode, setIsResetMode] = useState(false)
  const [newPassphrase, setNewPassphrase] = useState('')
  const [confirmPassphrase, setConfirmPassphrase] = useState('')
  const [rememberDevice, setRememberDevice] = useState(true)
  const [loading, setLoading] = useState(false)
  
  // Temporary storage of DEK during recovery reset passphrase flow
  const [recoveredDek, setRecoveredDek] = useState<CryptoKey | null>(null)

  useEffect(() => {
    if (!open) {
      const cleanup = () => {
        document.body.style.pointerEvents = ''
        document.body.style.overflow = ''
        document.body.style.paddingRight = ''
        document.documentElement.style.pointerEvents = ''
        document.documentElement.style.overflow = ''
      }
      const timer = setTimeout(cleanup, 150)
      return () => clearTimeout(timer)
    }
  }, [open])

  useEffect(() => {
    return () => {
      document.body.style.pointerEvents = ''
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
      document.documentElement.style.pointerEvents = ''
      document.documentElement.style.overflow = ''
    }
  }, [])

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passphrase) return
    setLoading(true)
    try {
      if (!kdfSalt || !kdfParams || !wrappedDek || !wrappedDekIv || !wrappedDekTag) {
        throw new Error('Missing event encryption parameters')
      }

      const decodedKdfParams = kdfParams as unknown as KDFParams
      const dek = await unlockWithPassphrase(
        passphrase,
        kdfSalt,
        decodedKdfParams,
        wrappedDek,
        wrappedDekIv,
        wrappedDekTag
      )

      if (rememberDevice) {
        await storeDEK(eventId, dek)
      }
      
      setPassphrase(eventId, passphrase)
      toast.success('Event unlocked successfully!')
      haptic.trigger('success')
      onUnlockSuccess(dek)
    } catch (err) {
      console.error('Passphrase unlock error:', err)
      toast.error('Incorrect passphrase. Please try again.')
      haptic.trigger('error')
    } finally {
      setLoading(false)
    }
  }

  const handleRecoveryUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recoveryKey) return
    setLoading(true)
    try {
      if (
        !recoveryKdfSalt ||
        !kdfParams ||
        !wrappedRecoveryDek ||
        !wrappedRecoveryIv ||
        !wrappedRecoveryTag
      ) {
        throw new Error('Missing recovery encryption parameters')
      }

      const cleanedRecoveryKey = recoveryKey.trim().toUpperCase()
      const decodedKdfParams = kdfParams as unknown as KDFParams
      
      const dek = await unlockWithRecoveryKey(
        cleanedRecoveryKey,
        recoveryKdfSalt,
        decodedKdfParams,
        wrappedRecoveryDek,
        wrappedRecoveryIv,
        wrappedRecoveryTag
      )

      setRecoveredDek(dek)
      setIsResetMode(true)
      setIsRecoveryMode(false)
      toast.success('Recovery key verified! Set a new passphrase.')
      haptic.trigger('success')
    } catch (err) {
      console.error('Recovery key unlock error:', err)
      toast.error('Invalid recovery key. Please check and try again.')
      haptic.trigger('error')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassphrase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassphrase || !confirmPassphrase || !recoveredDek) return

    if (newPassphrase !== confirmPassphrase) {
      toast.error('Passphrases do not match')
      haptic.trigger('error')
      return
    }

    setLoading(true)
    try {
      if (!kdfParams) throw new Error('Missing encryption parameters')

      const decodedKdfParams = kdfParams as unknown as KDFParams
      const rewrapped = await rewrapWithNewPassphrase(recoveredDek, newPassphrase, decodedKdfParams)

      // Update server with new wrapped DEK and salt
      await eventsApi.updateEventPassphrase(
        eventId,
        rewrapped.wrappedDek,
        rewrapped.wrappedDekIv,
        rewrapped.wrappedDekTag,
        rewrapped.kdfSalt
      )

      // Update kdfSalt client-side too
      // Wait: the client will re-fetch or we will pass back dek
      if (rememberDevice) {
        await storeDEK(eventId, recoveredDek)
      }

      setPassphrase(eventId, newPassphrase)
      toast.success('Passphrase updated and event unlocked!')
      haptic.trigger('success')
      onUnlockSuccess(recoveredDek)
    } catch (err) {
      console.error('Passphrase reset error:', err)
      toast.error('Failed to reset passphrase. Please try again.')
      haptic.trigger('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="w-[95vw] sm:max-w-[425px] overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        {isResetMode ? (
          /* PASSPHRASE RESET FORM */
          <form onSubmit={handleResetPassphrase} className="relative z-10 space-y-4">
            <DialogHeader>
              <div className="mx-auto w-12 h-12 bg-neutral-100 dark:bg-neutral-900 rounded-xl flex items-center justify-center border border-border mb-2 text-neutral-600 dark:text-neutral-300">
                <ShieldCheck size={28} />
              </div>
              <DialogTitle className="text-2xl text-center font-bold">Set New Passphrase</DialogTitle>
              <DialogDescription className="text-center text-sm">
                Create a new passphrase to encrypt this event. Keep it safe.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="new-passphrase">New Passphrase</Label>
                <Input
                  id="new-passphrase"
                  type="password"
                  value={newPassphrase}
                  onChange={(e) => setNewPassphrase(e.target.value)}
                  placeholder="Enter new passphrase"
                  className="bg-background"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-passphrase">Confirm Passphrase</Label>
                <Input
                  id="confirm-passphrase"
                  type="password"
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  placeholder="Confirm new passphrase"
                  className="bg-background"
                  required
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <Checkbox
                  id="remember-device-reset"
                  checked={rememberDevice}
                  onCheckedChange={(checked) => setRememberDevice(!!checked)}
                />
                <label
                  htmlFor="remember-device-reset"
                  className="text-xs text-muted-foreground font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Remember this event on this device
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 w-full">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl font-semibold shadow-md shadow-primary/10"
              >
                {loading ? 'Updating...' : 'Set Passphrase & Unlock'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsResetMode(false)
                  setNewPassphrase('')
                  setConfirmPassphrase('')
                  setRecoveredDek(null)
                }}
                className="w-full flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} />
                Cancel Reset
              </Button>
            </div>
          </form>
        ) : isRecoveryMode ? (
          /* RECOVERY FLOW */
          <form onSubmit={handleRecoveryUnlock} className="relative z-10 space-y-4">
            <DialogHeader>
              <div className="mx-auto w-12 h-12 bg-neutral-100 dark:bg-neutral-900 rounded-xl flex items-center justify-center border border-border mb-2 text-neutral-600 dark:text-neutral-300">
                <Warning size={28} />
              </div>
              <DialogTitle className="text-2xl text-center font-bold">Event Recovery</DialogTitle>
              <DialogDescription className="text-center text-sm">
                Enter the 24-character recovery key generated when the event was created.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="recovery-key">Recovery Key</Label>
                <Input
                  id="recovery-key"
                  type="text"
                  value={recoveryKey}
                  onChange={(e) => setRecoveryKey(e.target.value)}
                  placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                  className="bg-background font-mono tracking-wider"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 w-full">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl font-semibold shadow-md shadow-primary/10"
              >
                {loading ? 'Verifying...' : 'Verify Recovery Key'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsRecoveryMode(false)
                  setRecoveryKey('')
                }}
                className="w-full flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} />
                Back to Passphrase
              </Button>
            </div>
          </form>
        ) : (
          /* STANDARD UNLOCK FLOW */
          <form onSubmit={handleUnlock} className="relative z-10 space-y-4">
            <DialogHeader>
              <div className="mx-auto w-12 h-12 bg-neutral-100 dark:bg-neutral-900 rounded-xl flex items-center justify-center border border-border mb-2 text-neutral-600 dark:text-neutral-300">
                <Key size={28} />
              </div>
              <DialogTitle className="text-2xl text-center font-bold">End-to-End Encrypted</DialogTitle>
              <DialogDescription className="text-center text-sm">
                This event is secure. Enter the event passphrase to view and upload photos.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="passphrase">Event Passphrase</Label>
                <Input
                  id="passphrase"
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter passphrase"
                  className="bg-background"
                  required
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <Checkbox
                  id="remember-device"
                  checked={rememberDevice}
                  onCheckedChange={(checked) => setRememberDevice(!!checked)}
                />
                <label
                  htmlFor="remember-device"
                  className="text-xs text-muted-foreground font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Remember this event on this device
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 w-full items-center">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl font-semibold shadow-md shadow-primary/10"
              >
                {loading ? 'Decrypting...' : 'Unlock Event'}
              </Button>
              
              {onBack && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onBack}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={16} />
                  Back to Events
                </Button>
              )}
              
              <button
                type="button"
                onClick={() => setIsRecoveryMode(true)}
                className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 underline font-medium block text-center mt-1 cursor-pointer transition-colors"
              >
                Forgot passphrase? Use Recovery Key
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
