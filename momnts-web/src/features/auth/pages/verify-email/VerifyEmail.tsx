import { useState, useEffect, useCallback, useRef } from "react"
import { useNavigate } from "react-router"
import { useAuth } from "../../hooks/useAuth"
import { authApi } from "../../services/auth.api"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../../../../components/ui/input-otp"
import { Button } from "../../../../components/ui/button"
import { Spinner } from "../../../../components/ui/spinner"
import { EnvelopeSimple, ArrowCounterClockwise, ShieldCheck } from "@phosphor-icons/react"
import { toast } from "sonner"

const RESEND_COOLDOWN = 60 // seconds

const VerifyEmail = () => {
  const navigate = useNavigate()
  const { user, setUser, loading } = useAuth()
  const [otp, setOtp] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const isVerifyingRef = useRef(false)
  const isResendingRef = useRef(false)

  // Redirect if already verified
  useEffect(() => {
    if (!loading && user?.email_verified) {
      navigate("/dashboard", { replace: true })
    }
  }, [user, loading, navigate])

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true })
    }
  }, [user, loading, navigate])

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const handleVerify = useCallback(async (code: string) => {
    if (code.length !== 6 || isVerifyingRef.current) return

    try {
      isVerifyingRef.current = true
      setIsVerifying(true)
      const data = await authApi.verifyOtp(code)
      setUser(data.user)
      toast.success("Email verified successfully!")
      navigate("/dashboard", { replace: true })
    } catch (error: any) {
      toast.error(error.message || "Verification failed")
      setOtp("")
      if (error.retryAfter) {
        setCooldown(error.retryAfter)
      }
    } finally {
      isVerifyingRef.current = false
      setIsVerifying(false)
    }
  }, [setUser, navigate])

  const handleResend = async () => {
    if (cooldown > 0 || isResendingRef.current) return

    try {
      isResendingRef.current = true
      setIsResending(true)
      await authApi.sendOtp()
      toast.success("New verification code sent!")
      setCooldown(RESEND_COOLDOWN)
      setOtp("")
    } catch (error: any) {
      toast.error(error.message || "Failed to resend code")
      if (error.retryAfter) {
        setCooldown(error.retryAfter)
      }
    } finally {
      isResendingRef.current = false
      setIsResending(false)
    }
  }

  // Auto-submit when 6 digits entered
  const handleOtpChange = (value: string) => {
    setOtp(value)
    if (value.length === 6) {
      handleVerify(value)
    }
  }

  const formatCooldown = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`
  }

  if (!user) return null

  return (
    <div className="flex w-full h-screen auth-gradient-bg">
      <div className="auth-blob" />
      <div className="flex flex-col items-center justify-center w-full relative z-10 px-4">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mx-auto">
              <EnvelopeSimple size={32} weight="duotone" className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold select-none">Verify your email</h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 max-w-xs mx-auto">
                We sent a 6-digit code to{" "}
                <span className="font-medium text-foreground">{user.email}</span>
              </p>
            </div>
          </div>

          {/* OTP Input */}
          <div className="flex flex-col items-center gap-6">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={handleOtpChange}
              disabled={isVerifying}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className="w-12 h-14 text-lg font-semibold rounded-xl border-neutral-200 dark:border-neutral-700" />
                <InputOTPSlot index={1} className="w-12 h-14 text-lg font-semibold rounded-xl border-neutral-200 dark:border-neutral-700" />
                <InputOTPSlot index={2} className="w-12 h-14 text-lg font-semibold rounded-xl border-neutral-200 dark:border-neutral-700" />
                <InputOTPSlot index={3} className="w-12 h-14 text-lg font-semibold rounded-xl border-neutral-200 dark:border-neutral-700" />
                <InputOTPSlot index={4} className="w-12 h-14 text-lg font-semibold rounded-xl border-neutral-200 dark:border-neutral-700" />
                <InputOTPSlot index={5} className="w-12 h-14 text-lg font-semibold rounded-xl border-neutral-200 dark:border-neutral-700" />
              </InputOTPGroup>
            </InputOTP>

            {isVerifying && (
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Spinner className="h-4 w-4" />
                Verifying...
              </div>
            )}
          </div>

          {/* Resend */}
          <div className="flex flex-col items-center gap-3">
            <Button
              variant="ghost"
              onClick={handleResend}
              disabled={cooldown > 0 || isResending}
              className="text-sm gap-2"
            >
              {isResending ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <ArrowCounterClockwise size={16} weight="bold" />
              )}
              {cooldown > 0
                ? `Resend code in ${formatCooldown(cooldown)}`
                : "Resend verification code"}
            </Button>

            <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center max-w-xs">
              <ShieldCheck size={14} weight="bold" className="inline mr-1 -mt-0.5" />
              Code expires in 10 minutes. Never share it with anyone.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VerifyEmail
