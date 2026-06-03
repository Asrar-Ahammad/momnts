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
import GridDistortion from "../../../../components/ui/GridDistortion"

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
            <div className="register-main-view flex w-full min-h-screen">
                <div className="register-left flex flex-col items-center justify-start md:justify-center py-10 md:py-16 w-full md:w-1/2 auth-gradient-bg overflow-y-auto">
                    <div className="auth-blob" />
                    <form onSubmit={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        form.handleSubmit()
                    }}
                        className="w-full flex items-center justify-center relative z-10"
                    >
                        <FieldGroup className="w-2/3 md:w-1/2">
                            <div className="logo flex items-center justify-center gap-2">
                                <span className="text-4xl font-bold font-logo select-none">Momnts</span>
                            </div>
                            <div className="">
                                <h1 className="text-2xl font-bold select-none">Hello!</h1>
                            </div>
                            <FieldSet>
                                <form.Field
                                    name="username"
                                    children={(field) => (
                                        <Field>
                                            <FieldLabel htmlFor={field.name}>Username</FieldLabel>
                                            <Input
                                                required
                                                id={field.name}
                                                type="text"
                                                className="w-full"
                                                name={field.name}
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                            />
                                        </Field>
                                    )}
                                />
                                <form.Field
                                    name="email"
                                    children={(field) => (
                                        <Field>
                                            <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                                            <Input
                                                required
                                                id={field.name}
                                                type="email"
                                                className="w-full"
                                                name={field.name}
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                            />
                                        </Field>
                                    )}
                                />
                                <form.Field
                                    name="password"
                                    children={(field) => (
                                        <Field>
                                            <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                                            <div className="relative">
                                                <Input
                                                    required
                                                    id={field.name}
                                                    type={showPassword ? "text" : "password"}
                                                    className="w-full pr-10"
                                                    name={field.name}
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={(e) => field.handleChange(e.target.value)}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700 cursor-pointer"
                                                >
                                                    {showPassword ? <EyeSlashIcon size={20} /> : <EyeIcon size={20} />}
                                                </button>
                                            </div>
                                            {password.length > 0 && (
                                                <div className="mt-3 space-y-2">
                                                    <Progress value={(passwordCriteria.filter(c => c.test(password)).length / passwordCriteria.length) * 100} className="w-full">
                                                        <div className="flex justify-between items-center w-full">
                                                            <span className="text-[10px] uppercase font-semibold tracking-wider text-neutral-500">Password Strength</span>
                                                            <span className="text-[10px] font-bold tabular-nums text-neutral-500">{Math.round((passwordCriteria.filter(c => c.test(password)).length / passwordCriteria.length) * 100)}%</span>
                                                        </div>
                                                    </Progress>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                                                        {passwordCriteria.map((criterion) => {
                                                            const isMet = criterion.test(password)
                                                            return (
                                                                <div key={criterion.id} className="flex items-center gap-2 text-xs">
                                                                    {isMet ? (
                                                                        <Check className="text-emerald-500 h-4 w-4 shrink-0" weight="bold" />
                                                                    ) : (
                                                                        <div className="h-4 w-4 rounded-full border border-neutral-300 dark:border-neutral-700 shrink-0" />
                                                                    )}
                                                                    <span className={isMet ? "text-emerald-600 dark:text-emerald-400 font-medium transition-colors duration-200" : "text-neutral-500 dark:text-neutral-400 transition-colors duration-200"}>
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
                                            <FieldLabel htmlFor={field.name}>Confirm Password</FieldLabel>
                                            <div className="relative">
                                                <Input
                                                    required
                                                    id={field.name}
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    className="w-full pr-10"
                                                    name={field.name}
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={(e) => field.handleChange(e.target.value)}
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
                                <div className="flex flex-col gap-2 mt-2 mb-4">
                                    <div className="flex items-start gap-2.5">
                                        <Checkbox
                                            id="terms-checkbox"
                                            checked={agreed}
                                            onCheckedChange={(checked) => setAgreed(!!checked)}
                                            disabled={!isAgreementCheckboxEnabled}
                                        />
                                        <label
                                            htmlFor="terms-checkbox"
                                            className={`text-xs leading-normal select-none ${
                                                !isAgreementCheckboxEnabled 
                                                    ? "text-neutral-400 dark:text-neutral-500 cursor-not-allowed" 
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
                                                {openedTerms && <Check className="text-emerald-500 inline h-3 w-3" weight="bold" />}
                                            </a>{" "}
                                            and{" "}
                                            <a
                                                href="/privacy"
                                                onClick={handleOpenPrivacy}
                                                className="underline font-medium text-primary hover:opacity-80 inline-flex items-center gap-0.5"
                                            >
                                                Privacy Policy
                                                {openedPrivacy && <Check className="text-emerald-500 inline h-3 w-3" weight="bold" />}
                                            </a>
                                        </label>
                                    </div>
                                    {!isAgreementCheckboxEnabled && (
                                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                                            Please click and read both documents above to enable the checkbox.
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
                                <Field>
                                    <Button type="submit" className="w-full cursor-pointer" disabled={isLoading || !agreed || (password.length > 0 && !passwordCriteria.every(c => c.test(password))) || (!!sitekey && !captchaToken)}>
                                        {isLoading ? <Spinner className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        {isLoading ? "Starting..." : "Get Started"}
                                    </Button>
                                </Field>
                            </FieldSet>
                            <span className="select-none">Already have an account? <Link to={`/login${searchParams.get('redirect') ? `?redirect=${encodeURIComponent(searchParams.get('redirect')!)}` : ''}`} className="underline">Login</Link></span>
                        </FieldGroup>
                    </form>
                </div>
                <div className="register-right md:w-1/2 hidden md:block h-screen sticky top-0">
                    <div className="register-right-content w-full h-full p-2 relative overflow-hidden rounded-xl">
                        <div className="absolute inset-0 rounded-xl overflow-hidden">
                            <GridDistortion
                                imageSrc="/register_image.jpg"
                                grid={10}
                                mouse={0.1}
                                strength={0.15}
                                relaxation={0.9}
                            />
                        </div>
                        <div className="absolute inset-2 rounded-xl pointer-events-none bg-gradient-to-r from-background/60 via-transparent to-transparent" />
                        <div className="absolute inset-2 rounded-xl pointer-events-none bg-gradient-to-t from-background/50 via-transparent to-transparent" />
                    </div>
                </div>
            </div>
        </>
    )
}

export default Register