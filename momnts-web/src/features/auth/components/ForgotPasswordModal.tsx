import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../../components/ui/dialog"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Field, FieldLabel } from "../../../components/ui/field"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../../../components/ui/input-otp"
import { EyeIcon, EyeSlashIcon, CircleNotch, EnvelopeSimple, Key } from "@phosphor-icons/react"
import { authApi } from "../services/auth.api"
import { toast } from "sonner"
import { useForm, useStore } from "@tanstack/react-form"

interface ForgotPasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ForgotPasswordModal({ open, onOpenChange }: ForgotPasswordModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const isLoadingRef = useRef(false)

  const form = useForm({
    defaultValues: {
      email: "",
      otp: "",
      newPassword: "",
    },
    onSubmit: async ({ value }) => {
      if (step === 1) {
        if (!value.email || isLoadingRef.current) return

        try {
          isLoadingRef.current = true
          setIsLoading(true)
          await authApi.forgotPassword(value.email)
          toast.success("Verification code sent to your email")
          setStep(2)
        } catch (error: any) {
          toast.error(error.message || "Failed to send verification code")
        } finally {
          isLoadingRef.current = false
          setIsLoading(false)
        }
      } else {
        if (value.otp.length !== 6 || !value.newPassword || isLoadingRef.current) return

        try {
          isLoadingRef.current = true
          setIsLoading(true)
          await authApi.resetPassword(value.email, value.otp, value.newPassword)
          toast.success("Password reset successfully. You can now log in.")
          handleClose(false)
        } catch (error: any) {
          toast.error(error.message || "Failed to reset password")
        } finally {
          isLoadingRef.current = false
          setIsLoading(false)
        }
      }
    }
  })

  const otpVal = useStore(form.store, (state) => state.values.otp)
  const newPasswordVal = useStore(form.store, (state) => state.values.newPassword)

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      setTimeout(() => {
        setStep(1)
        form.reset()
      }, 300)
    }
    onOpenChange(newOpen)
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
          <form onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }} className="space-y-6">
            <form.Field
              name="email"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor="reset-email">Email Address</FieldLabel>
                  <Input 
                    id="reset-email" 
                    type="email" 
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="name@example.com"
                    required 
                    className="w-full"
                  />
                </Field>
              )}
            />
            <Button type="submit" className="w-full rounded-xl font-bold" disabled={isLoading}>
              {isLoading ? <CircleNotch size={18} className="animate-spin mr-2" /> : null}
              {isLoading ? "Sending..." : "Send Verification Code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }} className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <FieldLabel>Verification Code</FieldLabel>
              <form.Field
                name="otp"
                children={(field) => (
                  <InputOTP maxLength={6} value={field.state.value} onChange={(val) => field.handleChange(val)} disabled={isLoading}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                )}
              />
            </div>

            <form.Field
              name="newPassword"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor="new-password">New Password</FieldLabel>
                  <div className="relative">
                    <Input 
                      id="new-password" 
                      type={showPassword ? "text" : "password"} 
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
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
              )}
            />

            <Button type="submit" className="w-full rounded-xl font-bold" disabled={isLoading || otpVal.length !== 6 || !newPasswordVal}>
              {isLoading ? <CircleNotch size={18} className="animate-spin mr-2" /> : null}
              {isLoading ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
