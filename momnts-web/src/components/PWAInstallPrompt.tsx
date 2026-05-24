import { useState, useEffect } from 'react'
import { DownloadSimple, X } from '@phosphor-icons/react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * PWA install prompt banner.
 * Shows a dismissible banner suggesting the user install Momnts as an app.
 * Only appears when the browser fires `beforeinstallprompt` (Chrome/Edge/etc.)
 * or on iOS Safari where manual install instructions are needed.
 */
const PWAInstallPrompt = () => {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check if already dismissed within the last 7 days
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10)
      const sevenDays = 7 * 24 * 60 * 60 * 1000
      if (Date.now() - dismissedAt < sevenDays) return
    }

    // Detect iOS Safari
    const ua = navigator.userAgent
    const isiOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua)
    if (isiOS && isSafari) {
      setIsIOS(true)
      // Show after 30s on iOS to not be annoying
      const timer = setTimeout(() => setShowBanner(true), 30000)
      return () => clearTimeout(timer)
    }

    // Listen for Chrome/Edge beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
      // Show after a 20s delay so user has time to explore first
      setTimeout(() => setShowBanner(true), 20000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
    }
    setShowBanner(false)
    setInstallEvent(null)
  }

  const handleDismiss = () => {
    setShowBanner(false)
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  if (isInstalled || !showBanner) return null

  return (
    <div
      className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[200] w-[92%] max-w-[420px] animate-in slide-in-from-bottom-4 fade-in duration-500"
    >
      <div className="relative bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-2xl px-5 py-4 shadow-2xl flex items-center gap-4">
        {/* Icon */}
        <div className="shrink-0 w-11 h-11 rounded-xl bg-white/10 dark:bg-neutral-900/10 flex items-center justify-center">
          <DownloadSimple size={24} weight="bold" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">Install Momnts</p>
          {isIOS ? (
            <p className="text-xs text-white/60 dark:text-neutral-500 mt-0.5 leading-snug">
              Tap the share button, then "Add to Home Screen"
            </p>
          ) : (
            <p className="text-xs text-white/60 dark:text-neutral-500 mt-0.5 leading-snug">
              Add to your home screen for the best experience
            </p>
          )}
        </div>

        {/* Actions */}
        {!isIOS && (
          <button
            onClick={handleInstall}
            className="shrink-0 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
          >
            Install
          </button>
        )}

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="absolute -top-2 -right-2 w-6 h-6 bg-neutral-700 dark:bg-neutral-300 rounded-full flex items-center justify-center hover:bg-neutral-600 dark:hover:bg-neutral-400 transition-colors cursor-pointer"
          aria-label="Dismiss install prompt"
        >
          <X size={12} weight="bold" />
        </button>
      </div>
    </div>
  )
}

export default PWAInstallPrompt
