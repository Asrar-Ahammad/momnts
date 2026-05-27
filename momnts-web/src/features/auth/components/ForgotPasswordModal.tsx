import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../../components/ui/dialog"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Field, FieldLabel } from "../../../components/ui/field"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../../../components/ui/input-otp"
import { EyeIcon, EyeSlashIcon, CircleNotch, EnvelopeSimple, Key } from "@phosphor-icons/react"
import { authApi } from "../services/auth.api"
import { toast } from "sonner"

interface ForgotPasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ForgotPasswordModal({ open, onOpenChange }: ForgotPasswordModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      setTimeout(() => {
        setStep(1)
        setEmail("")
        setOtp("")
        setNewPassword("")
      }, 300)
    }
    onOpenChange(newOpen)
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)
    try {
      await authApi.forgotPassword(email)
      toast.success("Verification code sent to your email")
      setStep(2)
    } catch (error: any) {
      toast.error(error.message || "Failed to send verification code")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length !== 6 || !newPassword) return

    setIsLoading(true)
    try {
      await authApi.resetPassword(email, otp, newPassword)
      toast.success("Password reset successfully. You can now log in.")
      handleClose(false)
    } catch (error: any) {
      toast.error(error.message || "Failed to reset password")
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
              <EnvelopeSimple size={24} weight="duotone" className="text-neutral-900 dark:text-neutral-100" />
            ) : (
              <Key size={24} weight="duotone" className="text-neutral-900 dark:text-neutral-100" />
            )}
          </div>
          <DialogTitle className="text-center text-xl font-bold">
            {step === 1 ? "Forgot Password" : "Reset Password"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {step === 1 
              ? "Enter your email address and we'll send you a 6-digit code to reset your password."
              : "Enter the 6-digit code sent to your email and choose a new password."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="space-y-6">
            <Field>
              <FieldLabel htmlFor="reset-email">Email Address</FieldLabel>
              <Input 
                id="reset-email" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required 
                className="w-full"
              />
            </Field>
            <Button type="submit" className="w-full rounded-xl font-bold" disabled={isLoading}>
              {isLoading ? <CircleNotch size={18} className="animate-spin mr-2" /> : null}
              {isLoading ? "Sending..." : "Send Verification Code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-6">
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
              <FieldLabel htmlFor="new-password">New Password</FieldLabel>
              <div className="relative">
                <Input 
                  id="new-password" 
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
              {isLoading ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
