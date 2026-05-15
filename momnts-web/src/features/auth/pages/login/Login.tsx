import { Form, Link, useNavigate, useSearchParams } from "react-router"
import { Field, FieldGroup, FieldLabel, FieldSet } from "../../../../components/ui/field"
import { Input } from "../../../../components/ui/input"
import { Button } from "../../../../components/ui/button"
import { useEffect, useState } from "react"
import { useAuth } from "../../hooks/useAuth"
import { authApi } from "../../services/auth.api"
import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react"
import { toast } from "sonner"

const Login = () => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { user, setUser } = useAuth()
    const [showPassword, setShowPassword] = useState(false)

    useEffect(() => {
        if (user) {
            const redirect = searchParams.get('redirect')
            const safeRedirect = redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : "/dashboard"
            navigate(safeRedirect, { replace: true })
        }
    }, [user, navigate, searchParams])

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const email = formData.get("email") as string
        const password = formData.get("password") as string

        try {
            const data = await authApi.login(email, password)
            setUser(data.user)
            const redirect = searchParams.get('redirect')
            const safeRedirect = redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : "/dashboard"
            navigate(safeRedirect, { replace: true })
        } catch (error) {
            console.error("Login error:", error)
            toast.error(error instanceof Error ? error.message : "Login failed")
        }
    }

    return(
        <>
        <div className="register-main-view flex w-full h-screen">
            <div className="register-left flex flex-col items-center justify-center md:w-1/2 w-full">
                <Form onSubmit={handleLogin} 
                className="w-full flex items-center justify-center"
                >
                    <FieldGroup className="w-2/3 md:w-1/2">
                    <div className="logo flex items-center justify-center gap-2">
                        <span className="text-4xl font-bold font-logo select-none">Momnts</span>
                    </div>
                    <div className="flex items-start justify-start">
                      <h1 className="text-2xl font-bold select-none">Welcome Back!</h1>
                    </div>
                        <FieldSet>
                            <Field>
                                <FieldLabel htmlFor="email">Email</FieldLabel>
                                <Input required id="email" type="email" className="w-full" name="email" />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="password">Password</FieldLabel>
                                <div className="relative">
                                    <Input required id="password" type={showPassword ? "text" : "password"} className="w-full pr-10" name="password" />
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
                                <Button type="submit" className="w-full cursor-pointer">Log in</Button>
                            </Field>
                        </FieldSet>
                        <span className="select-none">Don't have an account? <Link to={`/register${searchParams.get('redirect') ? `?redirect=${encodeURIComponent(searchParams.get('redirect')!)}` : ''}`} className="underline">Get Started</Link></span>
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

export default Login