import { Form, Link, useNavigate, useSearchParams } from "react-router"
import { Field, FieldGroup, FieldLabel, FieldSet } from "../../../../components/ui/field"
import { Input } from "../../../../components/ui/input"
import { Button } from "../../../../components/ui/button"
import { useEffect, useState, useRef } from "react"
import { useAuth } from "../../hooks/useAuth"
import { authApi } from "../../services/auth.api"
import { EyeIcon, EyeSlashIcon, Check } from "@phosphor-icons/react"
import { toast } from "sonner"
import { Spinner } from "../../../../components/ui/spinner"
import { Progress } from "../../../../components/ui/progress"

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
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const toastId = useRef<string | number | null>(null)


    useEffect(() => {
        if (user) {
            const redirect = searchParams.get('redirect')
            const safeRedirect = redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : "/dashboard"
            navigate(safeRedirect, { replace: true })
        }
    }, [user, navigate, searchParams])

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

    const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const name = formData.get("username") as string
        const email = formData.get("email") as string
        const password = formData.get("password") as string
        const confirmPassword = formData.get("confirmPassword") as string

        const isPasswordValid = passwordCriteria.every(c => c.test(password))
        if (!isPasswordValid) {
            toast.error("Password must meet all security criteria")
            return
        }

        if (password !== confirmPassword) {
            toast.error("Passwords do not match")
            return
        }

        setIsLoading(true)
        try {
            const data = await authApi.register(name, email, password)
            setUser(data.user)
            const redirect = searchParams.get('redirect')
            const safeRedirect = redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : "/dashboard"
            navigate(safeRedirect, { replace: true })
        } catch (error) {
            console.error("Registration error:", error)
            toast.error(error instanceof Error ? error.message : "Registration failed")
        } finally {
            setIsLoading(false)
        }
    }
    return (
        <>
            <div className="register-main-view flex w-full h-screen">
                <div className="register-left flex flex-col items-center justify-center md:w-1/2 w-full auth-gradient-bg">
                    <div className="auth-blob" />
                    <Form onSubmit={handleRegister}
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
                                <Field>
                                    <FieldLabel htmlFor="username">Username</FieldLabel>
                                    <Input required id="username" type="text" className="w-full" name="username" />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="email">Email</FieldLabel>
                                    <Input required id="email" type="email" className="w-full" name="email" />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="password">Password</FieldLabel>
                                    <div className="relative">
                                        <Input required id="password" type={showPassword ? "text" : "password"} className="w-full pr-10" name="password" value={password} onChange={(e) => setPassword(e.target.value)} />
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
                                <Field>
                                    <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                                    <div className="relative">
                                        <Input required id="confirmPassword" type={showConfirmPassword ? "text" : "password"} className="w-full pr-10" name="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700 cursor-pointer"
                                        >
                                            {showConfirmPassword ? <EyeSlashIcon size={20} /> : <EyeIcon size={20} />}
                                        </button>
                                    </div>
                                </Field>
                                <Field>
                                    <Button type="submit" className="w-full cursor-pointer" disabled={isLoading || (password.length > 0 && !passwordCriteria.every(c => c.test(password)))}>
                                        {isLoading ? <Spinner className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        {isLoading ? "Starting..." : "Get Started"}
                                    </Button>
                                </Field>
                            </FieldSet>
                            <span className="select-none">Already have an account? <Link to={`/login${searchParams.get('redirect') ? `?redirect=${encodeURIComponent(searchParams.get('redirect')!)}` : ''}`} className="underline">Login</Link></span>
                        </FieldGroup>
                    </Form>
                </div>
                <div className="register-right md:w-1/2 hidden md:block">
                    <div className="register-right-content w-full h-full p-2">
                        <img src="/register_image.jpg" alt="register-image" className="w-full h-full object-cover rounded-xl" />
                    </div>
                </div>
            </div>
        </>
    )
}

export default Register