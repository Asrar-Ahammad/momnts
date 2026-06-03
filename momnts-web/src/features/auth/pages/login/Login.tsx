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
import GridDistortion from "../../../../components/ui/GridDistortion"


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
            <div className="register-main-view flex w-full h-screen">
                <div className="register-left flex flex-col items-center justify-center md:w-1/2 w-full auth-gradient-bg">
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
                            <div className="flex items-start justify-start">
                                <h1 className="text-3xl font-bold select-none font-sirage">Welcome Back!</h1>
                            </div>
                            <FieldSet>
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
                                            <div className="flex justify-end w-full mt-1">
                                                <button 
                                                    type="button" 
                                                    onClick={() => setIsForgotModalOpen(true)}
                                                    className="text-sm font-semibold text-slate-300 hover:text-slate-200 cursor-pointer"
                                                >
                                                    Forgot password?
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
                                <Field>
                                    <Button type="submit" className="w-full cursor-pointer" disabled={isLoading || (!!sitekey && !captchaToken)}>
                                        {isLoading ? <Spinner className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        {isLoading ? "Logging in..." : "Log in"}
                                    </Button>
                                </Field>
                            </FieldSet>
                            <span className="select-none">Don't have an account? <Link to={`/register${searchParams.get('redirect') ? `?redirect=${encodeURIComponent(searchParams.get('redirect')!)}` : ''}`} className="underline">Get Started</Link></span>
                        </FieldGroup>
                    </form>
                </div>
                <div className="register-right md:w-1/2 hidden md:block">
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
                    </div>
                </div>
            </div>
            <ForgotPasswordModal open={isForgotModalOpen} onOpenChange={setIsForgotModalOpen} />
        </>
    )
}

export default Login