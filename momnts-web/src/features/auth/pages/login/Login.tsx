import { Link, useNavigate, useSearchParams } from "react-router"
import { Field, FieldGroup, FieldLabel, FieldSet } from "../../../../components/ui/field"
import { Input } from "../../../../components/ui/input"
import { Button } from "../../../../components/ui/button"
import { useEffect, useState, useRef } from "react"
import { useAuth } from "../../hooks/useAuth"
import { authApi } from "../../services/auth.api"
import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { Spinner } from "../../../../components/ui/spinner"
import { ForgotPasswordModal } from "../../components/ForgotPasswordModal"
import { useForm } from "@tanstack/react-form"
import { useWebHaptics } from 'web-haptics/react'
import { Turnstile } from "../../../../components/ui/Turnstile"
import { GoogleLogo, AppleLogo } from "@phosphor-icons/react"

const Login = () => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { user, setUser } = useAuth()
    const haptic = useWebHaptics()
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const isLoadingRef = useRef(false)
    const [isForgotModalOpen, setIsForgotModalOpen] = useState(false)
    const [captchaToken, setCaptchaToken] = useState("")
    const sitekey = import.meta.env.PROD ? import.meta.env.VITE_TURNSTILE_SITEKEY : undefined


    useEffect(() => {
        if (user) {
            const redirect = searchParams.get('redirect')
            const safeRedirect = redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : "/dashboard"
            navigate(safeRedirect, { replace: true })
        }
    }, [user, navigate, searchParams])

    const form = useForm({
        defaultValues: {
            email: "",
            password: "",
        },
        onSubmit: async ({ value }) => {
            if (isLoadingRef.current) return
            try {
                isLoadingRef.current = true
                setIsLoading(true)
                const data = await authApi.login(value.email, value.password, captchaToken)
                setUser(data.user)
                haptic.trigger("success")
                const redirect = searchParams.get('redirect')
                const safeRedirect = redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : "/dashboard"
                navigate(safeRedirect, { replace: true })
            } catch (error) {
                console.error("Login error:", error)
                toast.error(error instanceof Error ? error.message : "Login failed")
                haptic.trigger("error")
            } finally {
                isLoadingRef.current = false
                setIsLoading(false)
            }
        }
    })

    return (
        <>
            <div className="flex items-center justify-center min-h-dvh w-full p-4 md:p-8 bg-neutral-100 dark:bg-neutral-950">
                <div className="flex w-full max-w-5xl bg-white dark:bg-[#0a0a0a] rounded-[2rem] shadow-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
                    <div className="flex flex-col w-full md:w-1/2 p-8 md:p-12">
                        <form onSubmit={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            form.handleSubmit()
                        }}
                            className="w-full max-w-sm mx-auto"
                        >
                            <div className="mb-8 text-center md:text-left">
                                <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                                    <span className="text-3xl font-bold font-logo select-none">Momnts</span>
                                </div>
                                <h1 className="text-3xl font-bold select-none font-sirage mb-2 text-neutral-900 dark:text-white">Welcome Back!</h1>
                                <p className="text-neutral-500 dark:text-neutral-400 text-sm">Please enter your details to continue</p>
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

                            <FieldSet className="space-y-4">
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
                                            <div className="flex justify-between items-center mb-1">
                                                <FieldLabel htmlFor={field.name} className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Password</FieldLabel>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsForgotModalOpen(true)}
                                                    className="text-xs font-medium text-primary hover:opacity-80 transition-opacity"
                                                >
                                                    Forgot password?
                                                </button>
                                            </div>
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
                                                    placeholder="Enter password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                                                >
                                                    {showPassword ? <EyeSlashIcon size={20} /> : <EyeIcon size={20} />}
                                                </button>
                                            </div>
                                        </Field>
                                    )}
                                />
                                {sitekey && (
                                    <Turnstile
                                        sitekey={sitekey}
                                        onVerify={setCaptchaToken}
                                        onExpire={() => setCaptchaToken("")}
                                        onError={() => setCaptchaToken("")}
                                    />
                                )}
                                <Field className="pt-2">
                                    <Button type="submit" className="w-full h-11 rounded-xl font-semibold shadow-lg shadow-primary/20" disabled={isLoading || (!!sitekey && !captchaToken)}>
                                        {isLoading ? <Spinner className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        {isLoading ? "Logging in..." : "Log in"}
                                    </Button>
                                </Field>
                            </FieldSet>
                            
                            <div className="mt-8 text-center">
                                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                                    Don't have an account? <Link to={`/register${searchParams.get('redirect') ? `?redirect=${encodeURIComponent(searchParams.get('redirect')!)}` : ''}`} className="font-semibold text-primary hover:underline">Sign up</Link>
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
                            <h2 className="text-4xl font-bold font-sirage mb-3">Capture<br/>Every Angle</h2>
                            <p className="text-lg text-white/90">Experience seamless, real-time photo sharing for all your live events.</p>
                        </div>
                    </div>
                </div>
            </div>
            <ForgotPasswordModal open={isForgotModalOpen} onOpenChange={setIsForgotModalOpen} />
        </>
    )
}

export default Login