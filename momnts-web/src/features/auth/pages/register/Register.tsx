import { Link, useNavigate, useSearchParams } from "react-router"
import { Field, FieldLabel, FieldSet } from "../../../../components/ui/field"
import { Input } from "../../../../components/ui/input"
import { Button } from "../../../../components/ui/button"
import { useEffect, useState, useRef } from "react"
import { useAuth } from "../../hooks/useAuth"
import { Checkbox } from "../../../../components/ui/checkbox"
import { authApi } from "../../services/auth.api"
import { EyeIcon, EyeSlashIcon, Check, ArrowRight, ArrowLeft } from "@phosphor-icons/react"
import { GoogleLogo, AppleLogo } from "@phosphor-icons/react"
import { toast } from "sonner"
import { Spinner } from "../../../../components/ui/spinner"
import { useWebHaptics } from 'web-haptics/react'
import { Progress } from "../../../../components/ui/progress"
import { useForm, useStore } from "@tanstack/react-form"
import { Turnstile } from "../../../../components/ui/Turnstile"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../components/ui/tooltip"
import { motion, AnimatePresence } from "framer-motion"
import { useSignUp } from "@clerk/clerk-react"

interface ClerkOAuthButtonsProps {
    redirectTo?: string
    agreed: boolean
    openedTerms: boolean
    openedPrivacy: boolean
    onOpenTerms: (e: React.MouseEvent<HTMLAnchorElement>) => void
    onOpenPrivacy: (e: React.MouseEvent<HTMLAnchorElement>) => void
    onAgreeChange: (val: boolean) => void
}

const ClerkOAuthButtons = ({ redirectTo, agreed, openedTerms, openedPrivacy, onOpenTerms, onOpenPrivacy, onAgreeChange }: ClerkOAuthButtonsProps) => {
    const { signUp } = useSignUp()
    const haptic = useWebHaptics()

    const handleOAuth = async (strategy: 'oauth_google' | 'oauth_apple') => {
        if (!agreed) {
            toast.error("Please agree to the Terms and Conditions and Privacy Policy before continuing.")
            haptic.trigger("error")
            return
        }
        try {
            if (!signUp) return
            const callbackUrl = new URL(window.location.origin + '/sso-callback')
            if (redirectTo) callbackUrl.searchParams.set('redirect', redirectTo)
            await signUp.authenticateWithRedirect({
                strategy,
                redirectUrl: callbackUrl.toString(),
                redirectUrlComplete: redirectTo || '/dashboard',
            })
        } catch (err) {
            console.error(`${strategy} sign-up failed:`, err)
            toast.error(`${strategy === 'oauth_google' ? 'Google' : 'Apple'} sign-up failed. Please try again.`)
        }
    }

    const isAgreementEnabled = openedTerms && openedPrivacy

    return (
        <div className="mb-2">
            {/* Inline consent — mirrors the gate enforced on form submission */}
            <div className="flex items-start gap-2.5 mb-3 p-3 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
                <Checkbox
                    id="oauth-terms-checkbox"
                    checked={agreed}
                    onCheckedChange={(checked) => onAgreeChange(!!checked)}
                    disabled={!isAgreementEnabled}
                    className={`mt-0.5 ${!isAgreementEnabled ? "pointer-events-none opacity-50" : "scale-110"}`}
                />
                <label
                    htmlFor="oauth-terms-checkbox"
                    className={`text-xs leading-relaxed select-none ${!isAgreementEnabled ? "text-neutral-400 dark:text-neutral-600 cursor-not-allowed" : "text-neutral-600 dark:text-neutral-400 cursor-pointer"}`}
                >
                    I agree to the{" "}
                    <a href="/terms" onClick={onOpenTerms} className="underline font-semibold text-primary hover:opacity-80 transition-opacity inline-flex items-center gap-0.5">
                        Terms{openedTerms && <Check size={12} className="text-emerald-500" weight="bold" />}
                    </a>{" "}and{" "}
                    <a href="/privacy" onClick={onOpenPrivacy} className="underline font-semibold text-primary hover:opacity-80 transition-opacity inline-flex items-center gap-0.5">
                        Privacy Policy{openedPrivacy && <Check size={12} className="text-emerald-500" weight="bold" />}
                    </a>
                    {!isAgreementEnabled && <span className="block text-[10px] text-amber-600 dark:text-amber-500 mt-0.5">Open both documents above to enable</span>}
                </label>
            </div>
            <div className="flex gap-3">
                <Button
                    type="button"
                    variant="outline"
                    className="flex-1 rounded-xl h-11 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300"
                    onClick={() => handleOAuth('oauth_google')}
                >
                    <GoogleLogo size={20} weight="bold" />
                    Google
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    className="flex-1 rounded-xl h-11 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300"
                    onClick={() => handleOAuth('oauth_apple')}
                >
                    <AppleLogo size={20} weight="fill" />
                    Apple
                </Button>
            </div>
        </div>
    )
}

const passwordCriteria = [
    { id: "length", label: "At least 8 characters", test: (pw: string) => pw.length >= 8 },
    { id: "uppercase", label: "At least one uppercase letter", test: (pw: string) => /[A-Z]/.test(pw) },
    { id: "lowercase", label: "At least one lowercase letter", test: (pw: string) => /[a-z]/.test(pw) },
    { id: "number", label: "At least one number", test: (pw: string) => /[0-9]/.test(pw) },
    { id: "special", label: "At least one special character", test: (pw: string) => /[^A-Za-z0-9]/.test(pw) },
]

const STEPS = [
    { title: "Identity", subtitle: "Who are you?", img: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1974&auto=format&fit=crop" },
    { title: "Security", subtitle: "Lock it down", img: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=2070&auto=format&fit=crop" },
    { title: "Finalize", subtitle: "Almost there!", img: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2070&auto=format&fit=crop" }
]

const Register = () => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { user, setUser } = useAuth()
    const haptic = useWebHaptics()
    
    const [step, setStep] = useState(0)
    const [direction, setDirection] = useState(1) // 1 for forward, -1 for backward

    const [isCheckingEmail, setIsCheckingEmail] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const toastId = useRef<string | number | null>(null)
    const isLoadingRef = useRef(false)
    
    const [captchaToken, setCaptchaToken] = useState("")
    const sitekey = import.meta.env.PROD ? import.meta.env.VITE_TURNSTILE_SITEKEY : undefined

    const [openedPrivacy, setOpenedPrivacy] = useState(false)
    const [openedTerms, setOpenedTerms] = useState(false)
    const [agreed, setAgreed] = useState(false)

    const isAgreementCheckboxEnabled = openedPrivacy && openedTerms

    const handleOpenPrivacy = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault()
        window.open('/privacy', '_blank')
        setOpenedPrivacy(true)
    }

    const handleOpenTerms = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault()
        window.open('/terms', '_blank')
        setOpenedTerms(true)
    }

    const form = useForm({
        defaultValues: {
            username: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
        onSubmit: async ({ value }) => {
            if (isLoadingRef.current) return

            if (!agreed) {
                toast.error("Please agree to the Terms and Conditions and Privacy Policy")
                haptic.trigger("error")
                return
            }

            try {
                isLoadingRef.current = true
                setIsLoading(true)
                const data = await authApi.register(value.username, value.email, value.password, captchaToken)
                setUser(data.user)
                haptic.trigger("success")
                navigate("/verify-email", { replace: true })
            } catch (error) {
                console.error("Registration error:", error)
                toast.error(error instanceof Error ? error.message : "Registration failed")
                haptic.trigger("error")
            } finally {
                isLoadingRef.current = false
                setIsLoading(false)
            }
        }
    })

    const username = useStore(form.store, (state) => state.values.username)
    const email = useStore(form.store, (state) => state.values.email)
    const password = useStore(form.store, (state) => state.values.password)
    const confirmPassword = useStore(form.store, (state) => state.values.confirmPassword)

    const isStep1Valid = username.trim().length >= 3 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    const isPasswordValid = passwordCriteria.every(c => c.test(password))
    const isStep2Valid = isPasswordValid && password === confirmPassword

    const nextStep = async () => {
        if (step === 0) {
            if (!isStep1Valid) {
                toast.error("Please enter a valid username and email.")
                haptic.trigger("error")
                return
            }
            try {
                setIsCheckingEmail(true)
                const { exists } = await authApi.checkEmail(email)
                if (exists) {
                    toast.error("An account with this email already exists. Try logging in.")
                    haptic.trigger("error")
                    return
                }
            } catch (error) {
                toast.error("Could not verify email. Please try again.")
                return
            } finally {
                setIsCheckingEmail(false)
            }
        }
        if (step === 1 && !isStep2Valid) {
            toast.error("Please ensure your passwords match and meet the criteria.")
            haptic.trigger("error")
            return
        }
        setDirection(1)
        setStep(prev => Math.min(prev + 1, STEPS.length - 1))
        haptic.trigger("selection")
    }

    const prevStep = () => {
        setDirection(-1)
        setStep(prev => Math.max(prev - 1, 0))
        haptic.trigger("selection")
    }

    useEffect(() => {
        if (!confirmPassword) {
            if (toastId.current) {
                toast.dismiss(toastId.current)
                toastId.current = null
            }
            return
        }
        const timer = setTimeout(() => {
            if (password !== confirmPassword) {
                if (!toastId.current) {
                    toastId.current = toast.error("Passwords do not match", { duration: Infinity })
                }
            } else {
                if (toastId.current) {
                    toast.dismiss(toastId.current)
                    toastId.current = null
                }
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [password, confirmPassword])

    const variants = {
        enter: (dir: number) => ({ x: dir > 0 ? 30 : -30, opacity: 0, scale: 0.95 }),
        center: { x: 0, opacity: 1, scale: 1 },
        exit: (dir: number) => ({ x: dir < 0 ? 30 : -30, opacity: 0, scale: 0.95 })
    }

    return (
        <div className="flex items-center justify-center min-h-dvh w-full p-4 md:p-8 bg-neutral-100 dark:bg-neutral-950">
            <div className="flex w-full max-w-5xl bg-white dark:bg-[#0a0a0a] rounded-[2rem] shadow-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
                
                {/* Form Side */}
                <div className="flex flex-col w-full md:w-1/2 p-6 md:p-10 relative">
                    
                    {/* Stepper Indicator */}
                    <div className="flex items-center gap-2 mb-8">
                        {STEPS.map((_, i) => (
                            <div key={i} className="flex-1 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                                <motion.div 
                                    className="h-full bg-primary"
                                    initial={{ width: "0%" }}
                                    animate={{ width: step >= i ? "100%" : "0%" }}
                                    transition={{ duration: 0.4, ease: "easeInOut" }}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl md:text-3xl font-bold font-logo select-none">Momnts</span>
                        </div>
                        <AnimatePresence mode="popLayout">
                            <motion.div
                                key={`header-${step}`}
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -10, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <h1 className="text-2xl md:text-3xl font-bold select-none font-sirage mb-1 text-neutral-900 dark:text-white">
                                    {STEPS[step].title}
                                </h1>
                                <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                                    {STEPS[step].subtitle}
                                </p>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <motion.form layout onSubmit={(e) => {
                        e.preventDefault()
                        if (step === 2) form.handleSubmit()
                    }} className="w-full flex-1 flex flex-col justify-between">
                        
                        <motion.div layout className="relative min-h-[300px]">
                            <AnimatePresence custom={direction} mode="popLayout">
                                <motion.div
                                    key={`step-${step}`}
                                    custom={direction}
                                    variants={variants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.3, type: "spring", bounce: 0.2 }}
                                    className="w-full"
                                >
                                    <FieldSet className="space-y-4">
                                        {/* STEP 0: Identity */}
                                        {step === 0 && (
                                            <>
                                                {import.meta.env.VITE_CLERK_PUBLISHABLE_KEY && (
                                                    <>
                                                        <ClerkOAuthButtons
                                                        redirectTo={searchParams.get('redirect') ?? undefined}
                                                        agreed={agreed}
                                                        openedTerms={openedTerms}
                                                        openedPrivacy={openedPrivacy}
                                                        onOpenTerms={handleOpenTerms}
                                                        onOpenPrivacy={handleOpenPrivacy}
                                                        onAgreeChange={setAgreed}
                                                    />
                                                        <div className="flex items-center gap-4 mb-2">
                                                            <div className="flex-1 h-[1px] bg-neutral-200 dark:bg-neutral-800"></div>
                                                            <span className="text-xs text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">or</span>
                                                            <div className="flex-1 h-[1px] bg-neutral-200 dark:bg-neutral-800"></div>
                                                        </div>
                                                    </>
                                                )}
                                                <form.Field
                                                    name="username"
                                                    children={(field) => (
                                                        <Field>
                                                            <FieldLabel htmlFor={field.name} className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">Username</FieldLabel>
                                                            <Input
                                                                required
                                                                autoFocus
                                                                id={field.name}
                                                                type="text"
                                                                className="w-full h-12 rounded-xl bg-neutral-50 dark:bg-neutral-900 border-transparent focus:border-primary transition-all shadow-sm focus:shadow-md"
                                                                name={field.name}
                                                                value={field.state.value}
                                                                onBlur={field.handleBlur}
                                                                onChange={(e) => field.handleChange(e.target.value)}
                                                                placeholder="johndoe"
                                                                onKeyDown={(e) => { if(e.key === 'Enter') nextStep() }}
                                                            />
                                                        </Field>
                                                    )}
                                                />
                                                <form.Field
                                                    name="email"
                                                    children={(field) => (
                                                        <Field>
                                                            <FieldLabel htmlFor={field.name} className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">Email</FieldLabel>
                                                            <Input
                                                                required
                                                                id={field.name}
                                                                type="email"
                                                                className="w-full h-12 rounded-xl bg-neutral-50 dark:bg-neutral-900 border-transparent focus:border-primary transition-all shadow-sm focus:shadow-md"
                                                                name={field.name}
                                                                value={field.state.value}
                                                                onBlur={field.handleBlur}
                                                                onChange={(e) => field.handleChange(e.target.value)}
                                                                placeholder="hello@example.com"
                                                                onKeyDown={(e) => { if(e.key === 'Enter') nextStep() }}
                                                            />
                                                        </Field>
                                                    )}
                                                />
                                            </>
                                        )}

                                        {/* STEP 1: Security */}
                                        {step === 1 && (
                                            <>
                                                <form.Field
                                                    name="password"
                                                    children={(field) => (
                                                        <Field>
                                                            <FieldLabel htmlFor={field.name} className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">Password</FieldLabel>
                                                            <div className="relative">
                                                                <Input
                                                                    required
                                                                    autoFocus
                                                                    id={field.name}
                                                                    type={showPassword ? "text" : "password"}
                                                                    className="w-full h-12 pr-10 rounded-xl bg-neutral-50 dark:bg-neutral-900 border-transparent focus:border-primary transition-all shadow-sm focus:shadow-md"
                                                                    name={field.name}
                                                                    value={field.state.value}
                                                                    onBlur={field.handleBlur}
                                                                    onChange={(e) => field.handleChange(e.target.value)}
                                                                    placeholder="Enter a strong password"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowPassword(!showPassword)}
                                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                                                                >
                                                                    {showPassword ? <EyeSlashIcon size={20} /> : <EyeIcon size={20} />}
                                                                </button>
                                                            </div>
                                                            {password.length > 0 && (
                                                                <div className="mt-3 space-y-2">
                                                                    <Progress value={(passwordCriteria.filter(c => c.test(password)).length / passwordCriteria.length) * 100} className="w-full h-1.5 rounded-full" />
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2">
                                                                        {passwordCriteria.map((criterion) => {
                                                                            const isMet = criterion.test(password)
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
                                                            <FieldLabel htmlFor={field.name} className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">Confirm Password</FieldLabel>
                                                            <div className="relative">
                                                                <Input
                                                                    required
                                                                    id={field.name}
                                                                    type={showConfirmPassword ? "text" : "password"}
                                                                    className="w-full h-12 pr-10 rounded-xl bg-neutral-50 dark:bg-neutral-900 border-transparent focus:border-primary transition-all shadow-sm focus:shadow-md"
                                                                    name={field.name}
                                                                    value={field.state.value}
                                                                    onBlur={field.handleBlur}
                                                                    onChange={(e) => field.handleChange(e.target.value)}
                                                                    placeholder="Confirm password"
                                                                    onKeyDown={(e) => { if(e.key === 'Enter') nextStep() }}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                                                                >
                                                                    {showConfirmPassword ? <EyeSlashIcon size={20} /> : <EyeIcon size={20} />}
                                                                </button>
                                                            </div>
                                                        </Field>
                                                    )}
                                                />
                                            </>
                                        )}

                                        {/* STEP 2: Finalize */}
                                        {step === 2 && (
                                            <>
                                                <div className="flex flex-col gap-1.5 pt-1 mb-4 bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800">
                                                    {!isAgreementCheckboxEnabled && (
                                                        <span className="text-[11px] text-amber-600 dark:text-amber-500 font-medium bg-amber-50 dark:bg-amber-500/10 p-2 rounded-md mb-2 block">
                                                            Please open and read both documents below to enable.
                                                        </span>
                                                    )}
                                                    <div className="flex items-start gap-3">
                                                        <TooltipProvider delayDuration={100}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div className="inline-block mt-0.5" tabIndex={!isAgreementCheckboxEnabled ? 0 : -1}>
                                                                        <Checkbox
                                                                            id="terms-checkbox"
                                                                            checked={agreed}
                                                                            onCheckedChange={(checked) => setAgreed(!!checked)}
                                                                            disabled={!isAgreementCheckboxEnabled}
                                                                            className={!isAgreementCheckboxEnabled ? "pointer-events-none" : "scale-110"}
                                                                        />
                                                                    </div>
                                                                </TooltipTrigger>
                                                                {!isAgreementCheckboxEnabled && (
                                                                    <TooltipContent side="top" className="max-w-[250px] text-center">
                                                                        <p>Please open and read both terms and policy pages to enable.</p>
                                                                    </TooltipContent>
                                                                )}
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <label
                                                            htmlFor="terms-checkbox"
                                                            className={`text-sm leading-relaxed select-none ${!isAgreementCheckboxEnabled
                                                                ? "text-neutral-400 dark:text-neutral-600 cursor-not-allowed"
                                                                : "text-neutral-700 dark:text-neutral-300 cursor-pointer"
                                                                }`}
                                                        >
                                                            I agree to the{" "}
                                                            <a
                                                                href="/terms"
                                                                onClick={handleOpenTerms}
                                                                className="underline font-semibold text-primary hover:opacity-80 inline-flex items-center gap-0.5 transition-opacity"
                                                            >
                                                                Terms and Conditions
                                                                {openedTerms && <Check size={14} className="text-emerald-500" weight="bold" />}
                                                            </a>{" "}
                                                            and{" "}
                                                            <a
                                                                href="/privacy"
                                                                onClick={handleOpenPrivacy}
                                                                className="underline font-semibold text-primary hover:opacity-80 inline-flex items-center gap-0.5 transition-opacity"
                                                            >
                                                                Privacy Policy
                                                                {openedPrivacy && <Check size={14} className="text-emerald-500" weight="bold" />}
                                                            </a>
                                                        </label>
                                                    </div>
                                                </div>

                                                {sitekey && (
                                                    <div className="flex justify-center my-4">
                                                        <Turnstile
                                                            sitekey={sitekey}
                                                            onVerify={setCaptchaToken}
                                                            onExpire={() => setCaptchaToken("")}
                                                            onError={() => setCaptchaToken("")}
                                                        />
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </FieldSet>
                                </motion.div>
                            </AnimatePresence>
                        </motion.div>
                        
                        {/* Controls */}
                        <div className="mt-8 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                            <div className="flex items-center justify-between gap-3">
                                {step > 0 && (
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        onClick={prevStep}
                                        className="h-12 px-6 rounded-xl font-medium"
                                    >
                                        <ArrowLeft size={18} className="mr-2" />
                                        Back
                                    </Button>
                                )}
                                
                                {step < 2 ? (
                                    <Button 
                                        type="button" 
                                        onClick={nextStep}
                                        disabled={isCheckingEmail}
                                        className="h-12 px-8 rounded-xl font-semibold shadow-lg shadow-primary/20 ml-auto group transition-all hover:scale-[1.02]"
                                    >
                                        {isCheckingEmail ? <Spinner className="mr-2 h-5 w-5 animate-spin" /> : null}
                                        {isCheckingEmail ? "Checking..." : "Continue"}
                                        {!isCheckingEmail && <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />}
                                    </Button>
                                ) : (
                                    <Button 
                                        type="submit" 
                                        className="flex-1 h-12 rounded-xl font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]" 
                                        disabled={isLoading || !agreed || (!!sitekey && !captchaToken)}
                                    >
                                        {isLoading ? <Spinner className="mr-2 h-5 w-5 animate-spin" /> : null}
                                        {isLoading ? "Starting..." : "Create Account"}
                                    </Button>
                                )}
                            </div>
                            
                            <div className="mt-6 text-center">
                                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                                    Already have an account? <Link to={`/login${searchParams.get('redirect') ? `?redirect=${encodeURIComponent(searchParams.get('redirect')!)}` : ''}`} className="font-semibold text-primary hover:underline">Log in</Link>
                                </span>
                            </div>
                        </div>
                    </motion.form>
                </div>

                {/* Visual Side */}
                <div className="hidden md:block w-1/2 relative bg-neutral-900 overflow-hidden">
                    <AnimatePresence mode="popLayout">
                        <motion.img 
                            key={`img-${step}`}
                            src={STEPS[step].img}
                            alt={STEPS[step].title} 
                            initial={{ opacity: 0, scale: 1.05 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.6 }}
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    </AnimatePresence>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-500"></div>
                    <div className="absolute bottom-10 left-10 right-10 text-white z-10">
                        <AnimatePresence mode="popLayout">
                            <motion.div
                                key={`text-${step}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.4, delay: 0.1 }}
                            >
                                <h2 className="text-4xl lg:text-5xl font-bold font-sirage mb-4 leading-tight">
                                    {step === 0 && <>Never Miss<br/>A Moment</>}
                                    {step === 1 && <>Keep Your<br/>Memories Safe</>}
                                    {step === 2 && <>Ready To<br/>Start Sharing?</>}
                                </h2>
                                <p className="text-lg text-white/80 max-w-md">
                                    {step === 0 && "Create an account to instantly receive high-quality photos from every event you attend."}
                                    {step === 1 && "We use enterprise-grade security to ensure your face vectors and personal photos remain entirely private."}
                                    {step === 2 && "Read through our commitments to your privacy and finalize your setup to jump right in."}
                                </p>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Register