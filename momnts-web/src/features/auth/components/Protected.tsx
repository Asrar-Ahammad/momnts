import { Navigate, useLocation } from "react-router";
import { useAuth } from "../hooks/useAuth";
import type { ReactNode } from "react";

interface ProtectedProps {
  children: ReactNode;
}

const Protected = ({ children }: ProtectedProps) => {
    const { loading, user } = useAuth()
    const location = useLocation()

    if (loading) {
        return (<main>
            <div className="loading-screen">
                <div className="loader"></div>
            </div>
        </main>)
    }
    if (!user) {
        const redirectUrl = location.pathname + location.search
        return <Navigate to={`/login?redirect=${encodeURIComponent(redirectUrl)}`} />
    }
    return <>{children}</>
}

export default Protected