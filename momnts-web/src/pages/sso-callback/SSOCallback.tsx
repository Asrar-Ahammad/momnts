import { useEffect } from 'react'
import { Spinner } from '../../components/ui/spinner'

/**
 * SSO Callback page for Clerk OAuth flows (Google/Apple).
 * Clerk's AuthenticateWithRedirectCallback handles the OAuth code exchange.
 * After completion, we honour the `?redirect=` param forwarded from the
 * login/register page so users land on their original deep link.
 */
const SSOCallback = () => {
  useEffect(() => {
    const handleCallback = async () => {
      try {
        const clerk = (window as any).Clerk
        if (clerk) {
          await clerk.handleRedirectCallback()
        }
        // Apply the same safe-redirect logic used by password login:
        // only accept relative paths (starts with '/' but not '//').
        const params = new URLSearchParams(window.location.search)
        const redirect = params.get('redirect')
        const safeRedirect =
          redirect && redirect.startsWith('/') && !redirect.startsWith('//')
            ? redirect
            : '/dashboard'
        // Full page reload so AuthProvider is remounted and reads the new Clerk token.
        window.location.href = safeRedirect
      } catch (err) {
        console.error('[SSO Callback] Error:', err)
        window.location.href = '/login'
      }
    }

    // Give Clerk a moment to initialize
    const timer = setTimeout(handleCallback, 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex items-center justify-center min-h-dvh w-full bg-neutral-100 dark:bg-neutral-950">
      <div className="flex flex-col items-center gap-4 text-neutral-500">
        <Spinner className="h-8 w-8 animate-spin" />
        <p className="text-sm">Completing sign-in...</p>
      </div>
    </div>
  )
}

export default SSOCallback
