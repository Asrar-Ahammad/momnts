import { Link, useNavigate, useSearchParams } from "react-router"
import { Field, FieldGroup, FieldLabel, FieldSet } from "../../../../components/ui/field"
import { Input } from "../../../../components/ui/input"
import { Button } from "../../../../components/ui/button"
import { useEffect, useState, useRef } from "react"
import { useAuth } from "../../hooks/useAuth"
import { Checkbox } from "../../../../components/ui/checkbox"
import { authApi } from "../../services/auth.api"
import { EyeIcon, EyeSlashIcon, Check } from "@phosphor-icons/react"
import { toast } from "sonner"
import { Spinner } from "../../../../components/ui/spinner"
import { useWebHaptics } from 'web-haptics/react'
import { Progress } from "../../../../components/ui/progress"
import { useForm, useStore } from "@tanstack/react-form"
import { Turnstile } from "../../../../components/ui/Turnstile"
import { GoogleLogo, AppleLogo } from "@phosphor-icons/react"
const passwordCriteria = [
    { id: "length", label: "At least 8 characters", test: (pw: string) => pw.length >= 8 },
    { id: "uppercase", label: "At least one uppercase letter", test: (pw: string) => /[A-Z]/.test(pw) },
    { id: "lowercase", label: "At least one lowercase letter", test: (pw: string) => /[a-z]/.test(pw) },
    { id: "number", label: "At least one number", test: (pw: string) => /[0-9]/.test(pw) },
    { id: "special", label: "At least one special character", test: (pw: string) => /[^A-Za-z0-9]/.test(pw) },
]



const Register = () => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { user, setUser } = useAuth()
    const haptic = useWebHaptics()
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

            const isPasswordValid = passwordCriteria.every(c => c.test(value.password))
            if (!isPasswordValid) {
                toast.error("Password must meet all security criteria")
                haptic.trigger("error")
                return
            }

            if (value.password !== value.confirmPassword) {
                toast.error("Passwords do not match")
                haptic.trigger("error")
                return
            }

            try {
                isLoadingRef.current = true
                setIsLoading(true)
                const data = await authApi.register(value.username, value.email, value.password, captchaToken)
                setUser(data.user)
                haptic.trigger("success")
                // Always redirect to verify-email for new users
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

    const password = useStore(form.store, (state) => state.values.password)
    const confirmPassword = useStore(form.store, (state) => state.values.confirmPassword)

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
                    toastId.current = toast.error("Passwords do not match", {
                        duration: Infinity,
                    })
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

    return (
        <>
            <div className="flex items-center justify-center min-h-dvh w-full p-4 md:p-8 bg-neutral-100 dark:bg-neutral-950">
                <div className="flex w-full max-w-5xl bg-white dark:bg-[#0a0a0a] rounded-[2rem] shadow-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
                    <div className="flex flex-col w-full md:w-1/2 p-6 md:p-10">
                        <form onSubmit={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            form.handleSubmit()
                        }}
                            className="w-full max-w-sm mx-auto"
                        >
                            <div className="mb-6 text-center md:text-left">
                                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                                    <span className="text-2xl md:text-3xl font-bold font-logo select-none">Momnts</span>
                                </div>
                                <h1 className="text-2xl md:text-3xl font-bold select-none font-sirage mb-1 text-neutral-900 dark:text-white">Create an Account</h1>
                                <p className="text-neutral-500 dark:text-neutral-400 text-sm">Join us to start capturing moments</p>
                            </div>

                            {/* 
                            <div className="flex gap-3 mb-6">
                                <Button type="button" variant="outline" className="flex-1 rounded-xl h-11 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300">
                                    <GoogleLogo size={20} weight="bold" />
                                    Google
                                </Button>
                                <Button type="button" variant="outline" className="flex-1 rounded-xl h-11 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300">
                                    <AppleLogo size={20} weight="fill" />
                                    Apple
                                </Button>
                            </div>
                            
                            <div className="flex items-center gap-4 mb-6">
                                <div className="flex-1 h-[1px] bg-neutral-200 dark:bg-neutral-800"></div>
                                <span className="text-xs text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">or</span>
                                <div className="flex-1 h-[1px] bg-neutral-200 dark:bg-neutral-800"></div>
                            </div>
                            */}

                            <FieldSet className="space-y-3">
                                <form.Field
                                    name="username"
                                    children={(field) => (
                                        <Field>
                                            <FieldLabel htmlFor={field.name} className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">Username</FieldLabel>
                                            <Input
                                                required
                                                id={field.name}
                                                type="text"
                                                className="w-full h-11 rounded-xl bg-neutral-50 dark:bg-neutral-900 border-transparent focus:border-primary"
                                                name={field.name}
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                                placeholder="johndoe"
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
                                                className="w-full h-11 rounded-xl bg-neutral-50 dark:bg-neutral-900 border-transparent focus:border-primary"
                                                name={field.name}
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                                placeholder="hello@example.com"
                                            />
                                        </Field>
                                    )}
                                />
                                <form.Field
                                    name="password"
                                    children={(field) => (
                                        <Field>
                                            <FieldLabel htmlFor={field.name} className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">Password</FieldLabel>
                                            <div className="relative">
                                                <Input
                                                    required
                                                    id={field.name}
                                                    type={showPassword ? "text" : "password"}
                                                    className="w-full h-11 pr-10 rounded-xl bg-neutral-50 dark:bg-neutral-900 border-transparent focus:border-primary"
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
                                                    <Progress value={(passwordCriteria.filter(c => c.test(password)).length / passwordCriteria.length) * 100} className="w-full h-1.5 rounded-full">
                                                    </Progress>

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
                                                    className="w-full h-11 pr-10 rounded-xl bg-neutral-50 dark:bg-neutral-900 border-transparent focus:border-primary"
                                                    name={field.name}
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={(e) => field.handleChange(e.target.value)}
                                                    placeholder="Confirm password"
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
                                <div className="flex flex-col gap-1.5 pt-1">
                                    <div className="flex items-start gap-2.5">
                                        <Checkbox
                                            id="terms-checkbox"
                                            checked={agreed}
                                            onCheckedChange={(checked) => setAgreed(!!checked)}
                                            disabled={!isAgreementCheckboxEnabled}
                                        />
                                        <label
                                            htmlFor="terms-checkbox"
                                            className={`text-xs leading-normal select-none ${!isAgreementCheckboxEnabled
                                                ? "text-neutral-400 dark:text-neutral-600 cursor-not-allowed"
                                                : "text-neutral-600 dark:text-neutral-300 cursor-pointer"
                                                }`}
                                        >
                                            I agree to the{" "}
                                            <a
                                                href="/terms"
                                                onClick={handleOpenTerms}
                                                className="underline font-medium text-primary hover:opacity-80 inline-flex items-center gap-0.5"
                                            >
                                                Terms and Conditions
                                                {openedTerms && <Check size={14} className="text-emerald-500" weight="bold" />}
                                            </a>{" "}
                                            and{" "}
                                            <a
                                                href="/privacy"
                                                onClick={handleOpenPrivacy}
                                                className="underline font-medium text-primary hover:opacity-80 inline-flex items-center gap-0.5"
                                            >
                                                Privacy Policy
                                                {openedPrivacy && <Check size={14} className="text-emerald-500" weight="bold" />}
                                            </a>
                                        </label>
                                    </div>
                                    {!isAgreementCheckboxEnabled && (
                                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                                            Please open and read both documents above to enable.
                                        </span>
                                    )}
                                </div>

                                {sitekey && (
                                    <Turnstile
                                        sitekey={sitekey}
                                        onVerify={setCaptchaToken}
                                        onExpire={() => setCaptchaToken("")}
                                        onError={() => setCaptchaToken("")}
                                    />
                                )}
                                <Field className="pt-2">
                                    <Button type="submit" className="w-full h-11 rounded-xl font-semibold shadow-lg shadow-primary/20" disabled={isLoading || !agreed || (password.length > 0 && !passwordCriteria.every(c => c.test(password))) || (!!sitekey && !captchaToken)}>
                                        {isLoading ? <Spinner className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        {isLoading ? "Starting..." : "Sign Up"}
                                    </Button>
                                </Field>
                            </FieldSet>
                            
                            <div className="mt-6 text-center">
                                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                                    Already have an account? <Link to={`/login${searchParams.get('redirect') ? `?redirect=${encodeURIComponent(searchParams.get('redirect')!)}` : ''}`} className="font-semibold text-primary hover:underline">Log in</Link>
                                </span>
                            </div>
                        </form>
                    </div>

                    {/* Visual Side */}
                    <div className="hidden md:block w-1/2 relative bg-neutral-200 dark:bg-neutral-800">
                        <img 
                            src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2070&auto=format&fit=crop" 
                            alt="Live event concert" 
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                        <div className="absolute bottom-8 left-8 right-8 text-white">
                            <h2 className="text-4xl font-bold font-sirage mb-3">Never Miss<br/>A Moment</h2>
                            <p className="text-lg text-white/90">Create an account to start instantly sharing high-quality memories at your events.</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Register