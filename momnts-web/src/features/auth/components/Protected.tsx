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
        return (
            <main className="fixed inset-0 flex items-center justify-center bg-white dark:bg-neutral-950 z-50">
                <div className="w-8 h-8 border-2 border-neutral-300 dark:border-neutral-700 border-t-neutral-900 dark:border-t-white rounded-full animate-spin" />
            </main>
        )
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