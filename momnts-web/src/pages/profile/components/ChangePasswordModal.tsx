import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../../components/ui/dialog"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Field, FieldLabel } from "../../../components/ui/field"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../../../components/ui/input-otp"
import { EyeIcon, EyeSlashIcon, CircleNotch, Key, LockKeyOpen } from "@phosphor-icons/react"
import { authApi } from "../../../features/auth/services/auth.api"
import { useAuth } from "../../../features/auth/hooks/useAuth"
import { toast } from "sonner"

interface ChangePasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangePasswordModal({ open, onOpenChange }: ChangePasswordModalProps) {
  const { user } = useAuth()
  const [step, setStep] = useState<1 | 2>(1)
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      setTimeout(() => {
        setStep(1)
        setOtp("")
        setNewPassword("")
      }, 300)
    }
    onOpenChange(newOpen)
  }

  const handleSendOtp = async () => {
    setIsLoading(true)
    try {
      await authApi.sendChangePasswordOtp()
      toast.success("Verification code sent to your email")
      setStep(2)
    } catch (error: any) {
      toast.error(error.message || "Failed to send verification code")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length !== 6 || !newPassword) return

    setIsLoading(true)
    try {
      await authApi.changePassword(otp, newPassword)
      toast.success("Password changed successfully")
      handleClose(false)
    } catch (error: any) {
      toast.error(error.message || "Failed to change password")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md border-neutral-200 dark:border-neutral-800 rounded-3xl">
        <DialogHeader className="mb-4">
          <div className="mx-auto w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
            {step === 1 ? (
              <LockKeyOpen size={24} weight="duotone" className="text-neutral-900 dark:text-neutral-100" />
            ) : (
              <Key size={24} weight="duotone" className="text-neutral-900 dark:text-neutral-100" />
            )}
          </div>
          <DialogTitle className="text-center text-xl font-bold">
            Change Password
          </DialogTitle>
          <DialogDescription className="text-center">
            {step === 1
              ? <> We'll send a 6-digit verification code to <span className="font-bold text-white"> {user?.email} </span> to confirm it's you. </>
              : "Enter the 6-digit code sent to your email and choose a new password."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-6">
            <Button onClick={handleSendOtp} className="w-full rounded-xl font-bold" disabled={isLoading}>
              {isLoading ? <CircleNotch size={18} className="animate-spin mr-2" /> : null}
              {isLoading ? "Sending..." : "Send Verification Code"}
            </Button>
            <Button variant="ghost" onClick={() => handleClose(false)} className="w-full rounded-xl">
              Cancel
            </Button>
          </div>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <FieldLabel>Verification Code</FieldLabel>
              <InputOTP maxLength={6} value={otp} onChange={setOtp} disabled={isLoading}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Field>
              <FieldLabel htmlFor="new-profile-password">New Password</FieldLabel>
              <div className="relative">
                <Input 
                  id="new-profile-password" 
                  type={showPassword ? "text" : "password"} 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pr-10" 
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700 cursor-pointer"
                >
                  {showPassword ? <EyeSlashIcon size={20} /> : <EyeIcon size={20} />}
                </button>
              </div>
            </Field>

            <Button type="submit" className="w-full rounded-xl font-bold" disabled={isLoading || otp.length !== 6 || !newPassword}>
              {isLoading ? <CircleNotch size={18} className="animate-spin mr-2" /> : null}
              {isLoading ? "Updating..." : "Change Password"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
