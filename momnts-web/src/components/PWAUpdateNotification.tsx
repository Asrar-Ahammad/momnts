import { useEffect, useState } from 'react'
import { ArrowsClockwise } from '@phosphor-icons/react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Shows a toast-like notification when a new version of the app
 * is available and the service worker has finished downloading it.
 * User clicks "Update" to reload with the new version.
 */
const PWAUpdateNotification = () => {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      // Check for updates every 30 minutes
      if (registration) {
        setInterval(() => {
          registration.update()
        }, 30 * 60 * 1000)
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error)
    },
  })

  if (!needRefresh) return null

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 fade-in duration-500">
      <div className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl px-5 py-3 shadow-2xl flex items-center gap-3">
        <ArrowsClockwise size={20} weight="bold" className="shrink-0 animate-spin" />
        <p className="text-sm font-medium">New version available</p>
        <button
          onClick={() => updateServiceWorker(true)}
          className="shrink-0 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
        >
          Update
        </button>
      </div>
    </div>
  )
}

export default PWAUpdateNotification
