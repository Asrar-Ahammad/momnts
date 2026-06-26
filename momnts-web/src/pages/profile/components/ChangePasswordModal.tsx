import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../../components/ui/dialog"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Field, FieldLabel } from "../../../components/ui/field"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../../../components/ui/input-otp"
import { EyeIcon, EyeSlashIcon, CircleNotch, Key, LockKeyOpen, Check } from "@phosphor-icons/react"
import { authApi } from "../../../features/auth/services/auth.api"
import { useAuth } from "../../../features/auth/hooks/useAuth"
import { toast } from "sonner"
import { useForm, useStore } from "@tanstack/react-form"
import { Progress } from "../../../components/ui/progress"

const passwordCriteria = [
  { id: "length", label: "At least 8 characters", test: (pw: string) => pw.length >= 8 },
  { id: "uppercase", label: "At least one uppercase letter", test: (pw: string) => /[A-Z]/.test(pw) },
  { id: "lowercase", label: "At least one lowercase letter", test: (pw: string) => /[a-z]/.test(pw) },
  { id: "number", label: "At least one number", test: (pw: string) => /[0-9]/.test(pw) },
  { id: "special", label: "At least one special character", test: (pw: string) => /[^A-Za-z0-9]/.test(pw) },
]

interface ChangePasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialStep?: 1 | 2
}

export function ChangePasswordModal({ open, onOpenChange, initialStep = 1 }: ChangePasswordModalProps) {
  const { user, logout } = useAuth()
  const [step, setStep] = useState<1 | 2>(initialStep)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const isLoadingRef = useRef(false)
  const toastId = useRef<string | number | null>(null)

  // Sync step with initialStep when the modal opens
  useEffect(() => {
    if (open) {
      setStep(initialStep)
    }
  }, [open, initialStep])

  const form = useForm({
    defaultValues: {
      otp: "",
      newPassword: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      const isPasswordValid = passwordCriteria.every(c => c.test(value.newPassword))
      if (value.otp.length !== 6 || !value.newPassword || value.newPassword !== value.confirmPassword || !isPasswordValid || isLoadingRef.current) return

      try {
        isLoadingRef.current = true
        setIsLoading(true)
        await authApi.changePassword(value.otp, value.newPassword)
        toast.success("Password changed successfully. Logging out...")
        handleClose(false)
        await logout()
      } catch (error: any) {
        toast.error(error.message || "Failed to change password")
      } finally {
        isLoadingRef.current = false
        setIsLoading(false)
      }
    }
  })

  const otpVal = useStore(form.store, (state) => state.values.otp)
  const newPasswordVal = useStore(form.store, (state) => state.values.newPassword)
  const confirmPasswordVal = useStore(form.store, (state) => state.values.confirmPassword)

  const isPasswordValid = passwordCriteria.every(c => c.test(newPasswordVal))

  useEffect(() => {
    if (!confirmPasswordVal) {
      if (toastId.current) {
        toast.dismiss(toastId.current)
        toastId.current = null
      }
      return
    }
    const timer = setTimeout(() => {
      if (newPasswordVal !== confirmPasswordVal) {
        if (!toastId.current) {
          toastId.current = toast.error("Passwords do not match", { duration: Infinity })
        }
      } else {
        if (toastId.current) {
          toast.dismiss(toastId.current)
          toastId.current = null
        }
      }
    }, 2000)
    return () => clearTimeout(timer)
  }, [newPasswordVal, confirmPasswordVal])

  useEffect(() => {
    return () => {
      if (toastId.current) {
        toast.dismiss(toastId.current)
      }
    }
  }, [])

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      if (toastId.current) {
        toast.dismiss(toastId.current)
        toastId.current = null
      }
      setTimeout(() => {
        setStep(initialStep)
        form.reset()
      }, 300)
    }
    onOpenChange(newOpen)
  }

  const handleSendOtp = async () => {
    if (isLoadingRef.current) return
    try {
      isLoadingRef.current = true
      setIsLoading(true)
      await authApi.sendChangePasswordOtp()
      toast.success("Verification code sent to your email")
      setStep(2)
    } catch (error: any) {
      toast.error(error.message || "Failed to send verification code")
    } finally {
      isLoadingRef.current = false
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
                  <FieldLabel htmlFor="new-profile-password">New Password</FieldLabel>
                  <div className="relative">
                    <Input 
                      id="new-profile-password" 
                      type={showPassword ? "text" : "password"} 
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="w-full pr-10" 
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700 cursor-pointer"
                    >
                      {showPassword ? <EyeSlashIcon size={20} /> : <EyeIcon size={20} />}
                    </button>
                  </div>
                  {newPasswordVal.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <Progress value={(passwordCriteria.filter(c => c.test(newPasswordVal)).length / passwordCriteria.length) * 100} className="w-full h-1.5 rounded-full" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2">
                        {passwordCriteria.map((criterion) => {
                          const isMet = criterion.test(newPasswordVal)
                          return (
                            <div key={criterion.id} className="flex items-center gap-2 text-xs">
                              {isMet ? (
                                <Check className="text-emerald-500 h-3.5 w-3.5 shrink-0" weight="bold" />
                              ) : (
                                <div className="h-3.5 w-3.5 rounded-full border border-neutral-300 dark:border-neutral-700 shrink-0" />
                              )}
                              <span className={isMet ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-neutral-500 dark:text-neutral-500"}>
                                {criterion.label}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </Field>
              )}
            />

            <form.Field
              name="confirmPassword"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor="confirm-profile-password">Confirm Password</FieldLabel>
                  <div className="relative">
                    <Input 
                      id="confirm-profile-password" 
                      type={showConfirmPassword ? "text" : "password"} 
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="w-full pr-10" 
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeSlashIcon size={20} /> : <EyeIcon size={20} />}
                    </button>
                  </div>
                </Field>
              )}
            />

            <Button type="submit" className="w-full rounded-xl font-bold" disabled={isLoading || otpVal.length !== 6 || !newPasswordVal || !confirmPasswordVal || newPasswordVal !== confirmPasswordVal || !isPasswordValid}>
              {isLoading ? <CircleNotch size={18} className="animate-spin mr-2" /> : null}
              {isLoading ? "Updating..." : "Change Password"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
