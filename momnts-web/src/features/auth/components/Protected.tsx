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

    // Hard block for NEW users who haven't verified their email.
    // Existing users (created before this feature rolled out) are allowed through and will see a banner instead.
    const FEATURE_ROLLOUT_DATE = new Date("2026-05-27T10:00:00Z").getTime()
    const isNewUser = user.created_at ? new Date(user.created_at).getTime() >= FEATURE_ROLLOUT_DATE : false

    if (!user.email_verified && isNewUser) {
        return <Navigate to="/verify-email" replace />
    }

    return <>{children}</>
}

export default Protected