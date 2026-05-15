import { Form, Link, useNavigate, useSearchParams } from "react-router"
import { Field, FieldGroup, FieldLabel, FieldSet } from "../../../../components/ui/field"
import { Input } from "../../../../components/ui/input"
import { Button } from "../../../../components/ui/button"
import { useEffect, useState, useRef } from "react"
import { useAuth } from "../../hooks/useAuth"
import { authApi } from "../../services/auth.api"
import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react"
import { toast } from "sonner"

const Register = () => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { user, setUser } = useAuth()
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
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

        if (password !== confirmPassword) {
            toast.error("Passwords do not match")
            return
        }

        try {
            const data = await authApi.register(name, email, password)
            setUser(data.user)
            const redirect = searchParams.get('redirect')
            const safeRedirect = redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : "/dashboard"
            navigate(safeRedirect, { replace: true })
        } catch (error) {
            console.error("Registration error:", error)
            toast.error(error instanceof Error ? error.message : "Registration failed")
        }
    }
    return(
        <>
        <div className="register-main-view flex w-full h-screen">
            <div className="register-left flex flex-col items-center justify-center md:w-1/2 w-full">
                <Form onSubmit={handleRegister} 
                className="w-full flex items-center justify-center"
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
                                <Button type="submit" className="w-full cursor-pointer">Get Started</Button>
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