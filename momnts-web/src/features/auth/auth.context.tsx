import { createContext, useState, useEffect, type ReactNode } from "react";
import { authApi, type User } from "./services/auth.api";
import { onSessionExpired } from "../../lib/apiFetch";

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  authSource: 'legacy' | 'clerk' | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authSource, setAuthSource] = useState<'legacy' | 'clerk' | null>(null);

  // Listen for 401s from any API call — immediately clear auth state
  useEffect(() => {
    const unsubscribe = onSessionExpired(() => {
      setUser(null);
      setAuthSource(null);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Try Clerk auth first, then fall back to legacy JWT
  useEffect(() => {
    const checkAuth = async () => {
      // ── Try Clerk session ─────────────────────────────────────────
      const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
      if (clerkPubKey) {
        try {
          const { useAuth: _useAuth } = await import('@clerk/clerk-react');
          // We can't use hooks here, so check for Clerk session cookie/token
          // The actual Clerk auth flow happens via ClerkProvider + useUser in components.
          // Here we just check if there's a Clerk session token available.
          const clerkToken = await getClerkToken();
          if (clerkToken) {
            // Use the Clerk token to call our backend's /auth/me endpoint
            const response = await fetch(
              `${import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'}/api/auth/me?_t=${Date.now()}`,
              {
                headers: { Authorization: `Bearer ${clerkToken}` },
                cache: 'no-store',
              }
            );
            if (response.ok) {
              const data = await response.json();
              setUser(data.user);
              setAuthSource('clerk');
              setLoading(false);
              return;
            }
          }
        } catch {
          // Clerk not available or session invalid — fall through to legacy
        }
      }

      // ── Legacy JWT check ──────────────────────────────────────────
      const token = localStorage.getItem('token');

      const isTokenExpired = (tok: string | null): boolean => {
        if (!tok) return true;
        try {
          const parts = tok.split('.');
          if (parts.length !== 3) return true;
          const base64Url = parts[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            window.atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const payload = JSON.parse(jsonPayload);
          if (typeof payload.exp === 'number') {
            return payload.exp < Math.floor(Date.now() / 1000);
          }
          return false;
        } catch {
          return true;
        }
      };

      if (!token || isTokenExpired(token)) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setUser(null);
        setAuthSource(null);
        setLoading(false);
        return;
      }

      try {
        const userData = await authApi.getMe();
        setUser(userData);
        setAuthSource('legacy');
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setUser(null);
        setAuthSource(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const logout = async () => {
    try {
      if (authSource === 'clerk') {
        // Clerk sign-out is handled by Clerk's own hook (useClerk().signOut())
        // We just clear our local state here
        const { useClerk } = await import('@clerk/clerk-react');
        // Note: can't use hook here — Clerk signOut should be called from component
      }
      await authApi.logout();
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    } finally {
      setUser(null);
      setAuthSource(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, setLoading, logout, authSource }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Attempt to get a Clerk session token.
 * This uses Clerk's `__session` cookie approach for SSR-compatible apps,
 * or the Clerk JS SDK's getToken() method.
 */
async function getClerkToken(): Promise<string | null> {
  try {
    // 1. Try to get __session cookie directly (sync and immediate)
    const cookieToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('__session='))
      ?.split('=')[1];
    if (cookieToken) {
      return decodeURIComponent(cookieToken);
    }

    // 2. Fall back to Clerk global object
    const clerkInstance = (window as any).Clerk;
    if (clerkInstance?.session) {
      const token = await clerkInstance.session.getToken();
      return token;
    }
    return null;
  } catch {
    return null;
  }
}
